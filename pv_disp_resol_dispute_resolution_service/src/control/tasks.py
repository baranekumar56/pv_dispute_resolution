import asyncio
import logging
from src.control.celery_app import celery_app
from src.core.exceptions import TaskEnqueueError

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine in a sync Celery task.
    Fixed version that properly handles event loop cleanup and connection management.
    """
    # Get or create event loop - don't create a new one every time
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    try:
        return loop.run_until_complete(coro)
    except Exception as e:
        logger.error(f"Error in async execution: {e}")
        raise
    finally:
        # Don't close the loop - let it be reused
        # Just cancel any pending tasks if necessary
        try:
            pending = asyncio.all_tasks(loop)
            for task in pending:
                if not task.done():
                    task.cancel()
            if pending:
                loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        except Exception as e:
            logger.warning(f"Error cleaning up tasks: {e}")


@celery_app.task(
    name="src.control.tasks.process_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="email_processing",
    autoretry_for=(Exception,),  # Add automatic retry for exceptions
    retry_backoff=True,  # Exponential backoff
    retry_backoff_max=600,  # Max 10 minutes
    retry_jitter=True,  # Add jitter to prevent thundering herd
)
def process_email_task(
    self,
    email_id: int,
    sender_email: str,
    subject: str,
    body_text: str,
    attachment_texts: list,
):
    """
    Main Celery task: runs the LangGraph email processing pipeline (Groq edition).
    """
    logger.info(f"[Task] Processing email_id={email_id}")

    async def _run():
        from src.data.clients.postgres import AsyncSessionLocal
        from src.control.agents.email_processing_agent import run_email_processing
        from src.handlers.http_clients.llm_client import get_llm_client
        
        # Create a new session for each task execution
        async with AsyncSessionLocal() as session:
            try:
                result = await run_email_processing(
                    email_id=email_id,
                    sender_email=sender_email,
                    subject=subject,
                    body_text=body_text,
                    attachment_texts=attachment_texts,
                    db_session=session,
                    llm_client=get_llm_client(),
                )
                
                if result.get("error"):
                    raise Exception(result["error"])
                
                # Commit any pending changes
                await session.commit()
                
                return {
                    "dispute_id": result.get("dispute_id"),
                    "analysis_id": result.get("analysis_id"),
                    "classification": result.get("classification"),
                    "auto_response_generated": result.get("auto_response_generated"),
                    "groq_extracted_invoice_number": (result.get("groq_extracted") or {}).get("invoice_number"),
                }
            except Exception as e:
                await session.rollback()
                logger.error(f"Error processing email {email_id}: {e}", exc_info=True)
                raise
            finally:
                # Ensure session is properly closed
                await session.close()

    try:
        return _run_async(_run())
    except Exception as exc:
        logger.error(f"[Task] Failed processing email_id={email_id}: {exc}", exc_info=True)
        
        # Mark as failed in database on final retry
        if self.request.retries >= self.max_retries:
            async def _mark_failed():
                from src.data.clients.postgres import AsyncSessionLocal
                from src.data.repositories.repositories import EmailRepository
                async with AsyncSessionLocal() as session:
                    try:
                        repo = EmailRepository(session)
                        await repo.update_status(email_id, "FAILED", str(exc))
                        await session.commit()
                    except Exception as db_error:
                        logger.error(f"Failed to mark email {email_id} as failed: {db_error}")
                    finally:
                        await session.close()
            
            _run_async(_mark_failed())
            raise
        
        # Retry the task
        raise self.retry(exc=exc, countdown=30)


# Update summarize_episodes_task similarly
@celery_app.task(
    name="src.control.tasks.summarize_episodes_task",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="memory",
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def summarize_episodes_task(self, dispute_id: int):
    """Generates/updates a rolling memory summary for the dispute."""
    logger.info(f"[Task] Summarizing episodes for dispute_id={dispute_id}")
    
    async def _run():
        from src.data.clients.postgres import AsyncSessionLocal
        from src.data.repositories.repositories import MemoryEpisodeRepository, MemorySummaryRepository
        from src.data.models.postgres.models import DisputeMemorySummary
        from src.handlers.http_clients.llm_client import get_llm_client

        async with AsyncSessionLocal() as session:
            try:
                ep_repo = MemoryEpisodeRepository(session)
                sum_repo = MemorySummaryRepository(session)

                episodes = await ep_repo.get_episodes_for_dispute(dispute_id, limit=50)
                if not episodes:
                    return

                existing_summary = await sum_repo.get_for_dispute(dispute_id)
                existing_text = existing_summary.summary_text if existing_summary else None

                llm = get_llm_client()
                episode_dicts = [
                    {"actor": ep.actor, "content_text": ep.content_text}
                    for ep in episodes
                ]
                new_summary_text = await llm.summarize_episodes(episode_dicts, existing_text)

                last_episode = episodes[-1]

                if existing_summary:
                    existing_summary.summary_text = new_summary_text
                    existing_summary.covered_up_to_episode_id = last_episode.episode_id
                    existing_summary.version += 1
                else:
                    summary = DisputeMemorySummary(
                        dispute_id=dispute_id,
                        summary_text=new_summary_text,
                        covered_up_to_episode_id=last_episode.episode_id,
                        version=1,
                    )
                    session.add(summary)

                await session.commit()
                logger.info(f"[Task] Summary updated for dispute_id={dispute_id}")
            except Exception as e:
                await session.rollback()
                raise
            finally:
                await session.close()

    try:
        _run_async(_run())
    except Exception as exc:
        logger.error(f"[Task] Summarization failed for dispute_id={dispute_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)