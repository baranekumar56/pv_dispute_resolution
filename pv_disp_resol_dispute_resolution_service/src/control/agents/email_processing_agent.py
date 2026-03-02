"""
LangGraph-based email processing agent (Groq edition).

Pipeline:
  extract_text
      ↓
  extract_invoice_data_via_groq
      ↓
  identify_invoice
      ↓
  fetch_context
      ↓
  classify_email
      ↓
  generate_ai_response
      ↓
  persist_results

KEY DESIGN: Each node that needs DB access creates its OWN session.
This avoids "cannot perform operation: another operation is in progress"
which happens when a single AsyncSession is shared across LangGraph's
internal asyncio.create_task() calls.
"""

from __future__ import annotations

import re
import json
import logging
from typing import TypedDict, Optional, List, Dict
from datetime import datetime, timezone

from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


# ─── State ────────────────────────────────────────────────────────────────────

class EmailProcessingState(TypedDict):
    email_id: int
    sender_email: str
    subject: str
    body_text: str
    attachment_texts: List[str]
    all_text: str
    groq_extracted: Optional[Dict]
    candidate_invoice_numbers: List[str]
    matched_invoice_id: Optional[int]
    matched_invoice_number: Optional[str]
    matched_payment_id: Optional[int]
    customer_id: Optional[str]
    routing_confidence: float
    invoice_details: Optional[Dict]
    payment_details: Optional[Dict]
    existing_dispute_id: Optional[int]
    memory_summary: Optional[str]
    recent_episodes: List[Dict]
    pending_questions: List[Dict]
    classification: str
    dispute_type_name: str
    priority: str
    description: str
    ai_summary: str
    ai_response: Optional[str]
    confidence_score: float
    auto_response_generated: bool
    questions_to_ask: List[str]
    memory_context_used: bool
    episodes_referenced: List[int]
    _answers_pending_questions: List[int]
    dispute_id: Optional[int]
    analysis_id: Optional[int]
    error: Optional[str]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_full_text(state: EmailProcessingState) -> str:
    parts = [state["subject"], state["body_text"]] + state["attachment_texts"]
    return "\n\n".join(filter(None, parts))


def _regex_invoice_numbers(text: str) -> List[str]:
    candidates: set[str] = set()
    patterns = [
        r"(?:invoice\s*(?:no\.?|number|#|num)[:\s#-]*)([\w\-/]+)",
        r"(?:inv[\.#\-/]*)([\w\-/]{4,20})",
        r"(?:bill\s*(?:no\.?|number|#)[:\s#-]*)([\w\-/]+)",
        r"(?:reference\s*(?:no\.?|number|#|:)\s*)([\w\-/]{4,20})",
        r"\b(INV[-/]?\d{3,10})\b",
        r"(?:invoice|inv)\D{0,10}(\d{4,8})\b",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            val = m.group(1).strip().upper()
            if len(val) >= 3:
                candidates.add(val)
    return list(candidates)


# ─── Nodes ────────────────────────────────────────────────────────────────────

async def node_extract_text(state: EmailProcessingState) -> EmailProcessingState:
    return {**state, "all_text": _build_full_text(state)}


async def node_extract_invoice_data_via_groq(
    state: EmailProcessingState, llm_client=None
) -> EmailProcessingState:
    groq_extracted: Optional[Dict] = None
    candidates: List[str] = []

    if llm_client:
        try:
            groq_extracted = await llm_client.extract_invoice_data(state["all_text"])
            inv_num = groq_extracted.get("invoice_number")
            if inv_num:
                candidates.append(str(inv_num).upper().strip())
            po = groq_extracted.get("po_number")
            if po:
                candidates.append(str(po).upper().strip())
        except Exception as e:
            logger.warning(
                f"[email_id={state['email_id']}] Groq invoice extraction failed: {e}. Falling back to regex."
            )

    for c in _regex_invoice_numbers(state["all_text"]):
        if c not in candidates:
            candidates.append(c)

    logger.info(f"[email_id={state['email_id']}] Invoice candidates: {candidates}")
    return {**state, "groq_extracted": groq_extracted, "candidate_invoice_numbers": candidates}


async def node_identify_invoice(
    state: EmailProcessingState, db_session=None
) -> EmailProcessingState:
    """Each DB node creates its own session to avoid asyncpg cross-task conflicts."""
    from src.data.clients.postgres import AsyncSessionLocal
    from src.data.repositories.repositories import InvoiceRepository, PaymentRepository

    matched_invoice = None
    matched_payment = None
    confidence = 0.0

    async with AsyncSessionLocal() as session:
        inv_repo = InvoiceRepository(session)
        pay_repo = PaymentRepository(session)

        # Exact match
        for candidate in state["candidate_invoice_numbers"]:
            invoice = await inv_repo.get_by_invoice_number(candidate)
            if invoice:
                matched_invoice = invoice
                confidence = 0.95
                break

        # Fuzzy fallback
        if not matched_invoice and state["candidate_invoice_numbers"]:
            for candidate in state["candidate_invoice_numbers"]:
                results = await inv_repo.search_by_number_fuzzy(candidate)
                if results:
                    matched_invoice = results[0]
                    confidence = 0.65
                    break

        # Derive customer_id
        customer_id = state.get("customer_id")
        if not customer_id and state.get("groq_extracted"):
            customer_id = (
                state["groq_extracted"].get("customer_id")
                or state["groq_extracted"].get("customer_name")
            )
        if not customer_id:
            sender = state["sender_email"]
            domain = sender.split("@")[-1].split(".")[0] if "@" in sender else sender
            customer_id = domain

        # Payment match
        if matched_invoice and customer_id:
            matched_payment = await pay_repo.get_by_customer_and_invoice(
                customer_id, matched_invoice.invoice_number
            )

        # Extract values before session closes
        invoice_id = matched_invoice.invoice_id if matched_invoice else None
        invoice_number = matched_invoice.invoice_number if matched_invoice else None
        payment_id = matched_payment.payment_detail_id if matched_payment else None

    return {
        **state,
        "matched_invoice_id": invoice_id,
        "matched_invoice_number": invoice_number,
        "matched_payment_id": payment_id,
        "customer_id": customer_id,
        "routing_confidence": confidence,
    }


async def node_fetch_context(
    state: EmailProcessingState, db_session=None
) -> EmailProcessingState:
    from src.data.clients.postgres import AsyncSessionLocal
    from src.data.repositories.repositories import (
        InvoiceRepository, PaymentRepository, DisputeRepository,
        MemoryEpisodeRepository, MemorySummaryRepository, OpenQuestionRepository,
    )

    invoice_details = None
    payment_details = None
    existing_dispute_id = None
    memory_summary = None
    recent_episodes = []
    pending_questions = []

    async with AsyncSessionLocal() as session:
        if state["matched_invoice_id"]:
            inv_repo = InvoiceRepository(session)
            invoice = await inv_repo.get_by_id(state["matched_invoice_id"])
            if invoice:
                db_details = invoice.invoice_details or {}
                groq_data = state.get("groq_extracted") or {}
                invoice_details = {**db_details, **{k: v for k, v in groq_data.items() if v is not None}}

        if state["matched_payment_id"]:
            pay_repo = PaymentRepository(session)
            payment = await pay_repo.get_by_id(state["matched_payment_id"])
            if payment:
                payment_details = payment.payment_details

        if state["customer_id"] and state["matched_invoice_id"]:
            dispute_repo = DisputeRepository(session)
            open_disputes = await dispute_repo.get_by_customer(state["customer_id"])
            matching = [d for d in open_disputes if d.invoice_id == state["matched_invoice_id"]]
            if matching:
                existing_dispute = matching[0]
                existing_dispute_id = existing_dispute.dispute_id

                ep_repo = MemoryEpisodeRepository(session)
                recent_eps = await ep_repo.get_latest_n(existing_dispute_id, n=5)
                recent_episodes = [
                    {"actor": ep.actor, "type": ep.episode_type, "text": ep.content_text[:400]}
                    for ep in recent_eps
                ]

                sum_repo = MemorySummaryRepository(session)
                summary = await sum_repo.get_for_dispute(existing_dispute_id)
                if summary:
                    memory_summary = summary.summary_text

                q_repo = OpenQuestionRepository(session)
                pending_qs = await q_repo.get_pending_for_dispute(existing_dispute_id)
                pending_questions = [
                    {"question_id": q.question_id, "text": q.question_text}
                    for q in pending_qs
                ]

    return {
        **state,
        "invoice_details": invoice_details,
        "payment_details": payment_details,
        "existing_dispute_id": existing_dispute_id,
        "memory_summary": memory_summary,
        "recent_episodes": recent_episodes,
        "pending_questions": pending_questions,
    }


async def node_classify_email(
    state: EmailProcessingState, llm_client=None
) -> EmailProcessingState:
    if not llm_client:
        text_lower = state["all_text"].lower()
        dispute_keywords = ["wrong", "incorrect", "mismatch", "overcharged", "dispute", "error", "short payment"]
        classification = "DISPUTE" if any(k in text_lower for k in dispute_keywords) else "CLARIFICATION"
        return {
            **state,
            "classification": classification,
            "dispute_type_name": "Pricing Mismatch" if classification == "DISPUTE" else "General Clarification",
            "priority": "MEDIUM",
            "description": state["body_text"][:500],
            "_answers_pending_questions": [],
        }

    groq_block = ""
    if state.get("groq_extracted"):
        groq_block = f"\nEXTRACTED INVOICE DATA: {json.dumps(state['groq_extracted'])}"

    prompt = f"""You are an AR dispute classification expert. Analyze the following customer email and classify it.

EMAIL SUBJECT: {state['subject']}
EMAIL FROM: {state['sender_email']}
EMAIL BODY: {state['body_text'][:1000]}
ATTACHMENT TEXT: {' '.join(state['attachment_texts'])[:500]}
{groq_block}

EXISTING DISPUTE CONTEXT (if any):
{state.get('memory_summary') or 'None'}

PENDING UNANSWERED QUESTIONS:
{json.dumps(state['pending_questions']) if state['pending_questions'] else 'None'}

Return ONLY valid JSON with these exact keys:
{{
  "classification": "DISPUTE" or "CLARIFICATION",
  "dispute_type_name": one of ["Pricing Mismatch", "Short Payment", "Incorrect Quantity", "Duplicate Invoice", "Tax Error", "Currency Difference", "Service Quality", "General Clarification", "Payment Status Inquiry"],
  "priority": "LOW" or "MEDIUM" or "HIGH",
  "description": "2-3 sentence summary of the issue",
  "answers_pending_questions": [list of question_ids from pending questions that this email answers, e.g. [1, 3]]
}}"""

    try:
        response = await llm_client.chat(prompt)
        data = json.loads(response)
        return {
            **state,
            "classification": data.get("classification", "CLARIFICATION"),
            "dispute_type_name": data.get("dispute_type_name", "General Clarification"),
            "priority": data.get("priority", "MEDIUM"),
            "description": data.get("description", state["body_text"][:500]),
            "_answers_pending_questions": data.get("answers_pending_questions", []),
        }
    except Exception as e:
        logger.error(f"Classification LLM error: {e}")
        return {
            **state,
            "classification": "CLARIFICATION",
            "dispute_type_name": "General Clarification",
            "priority": "MEDIUM",
            "description": state["body_text"][:500],
            "_answers_pending_questions": [],
        }


async def node_generate_ai_response(
    state: EmailProcessingState, llm_client=None
) -> EmailProcessingState:
    if not llm_client:
        return {
            **state,
            "ai_summary": f"Customer raised a {state['classification'].lower()} about invoice {state.get('matched_invoice_number', 'unknown')}.",
            "ai_response": None,
            "auto_response_generated": False,
            "confidence_score": 0.0,
            "questions_to_ask": [],
            "memory_context_used": False,
            "episodes_referenced": [],
        }

    memory_context_used = bool(state.get("memory_summary") or state.get("recent_episodes"))

    context_block = ""
    if state.get("invoice_details"):
        context_block += f"\nINVOICE DETAILS: {json.dumps(state['invoice_details'])}"
    if state.get("payment_details"):
        context_block += f"\nPAYMENT DETAILS: {json.dumps(state['payment_details'])}"
    if state.get("memory_summary"):
        context_block += f"\nPREVIOUS CONVERSATION SUMMARY: {state['memory_summary']}"
    if state.get("recent_episodes"):
        context_block += "\nRECENT EXCHANGES:\n"
        for ep in state["recent_episodes"]:
            context_block += f"  [{ep['actor']}]: {ep['text'][:200]}\n"
    if state.get("pending_questions"):
        context_block += "\nSTILL AWAITING ANSWERS TO:\n"
        for q in state["pending_questions"]:
            context_block += f"  - {q['text']}\n"

    prompt = f"""You are an AR assistant for a finance team. Respond to this customer email.

CUSTOMER EMAIL:
Subject: {state['subject']}
From: {state['sender_email']}
Body: {state['body_text'][:800]}

CONTEXT:{context_block if context_block else ' None available.'}

Instructions:
- If you have enough information to fully resolve or clarify this query, provide a complete response.
- If you are missing critical information, ask for it specifically.
- Never make up invoice amounts or dates.
- Please dont use any of your own knowledge about typical invoice formats, instead rely solely on the provided context and extracted data.
- You always dont need to generate an AI response. If the email is just a simple follow-up or confirmation, you can skip the response.
- Be professional and concise.

Return ONLY valid JSON:
{{
  "ai_summary": "1-2 sentence summary of what the customer wants",
  "ai_response": "your response to the customer (null if cannot respond)",
  "can_auto_respond": true or false,
  "confidence_score": 0.0 to 1.0,
  "questions_to_ask": ["list of specific questions if info is missing"]
}}"""

    try:
        response = await llm_client.chat(prompt)
        data = json.loads(response)
        can_auto = data.get("can_auto_respond", False)
        return {
            **state,
            "ai_summary": data.get("ai_summary", ""),
            "ai_response": data.get("ai_response") if can_auto else None,
            "auto_response_generated": can_auto,
            "confidence_score": float(data.get("confidence_score", 0.0)),
            "questions_to_ask": data.get("questions_to_ask", []),
            "memory_context_used": memory_context_used,
            "episodes_referenced": [],
        }
    except Exception as e:
        logger.error(f"AI response LLM error: {e}")
        return {
            **state,
            "ai_summary": f"Customer email about invoice {state.get('matched_invoice_number', 'unknown')}.",
            "ai_response": None,
            "auto_response_generated": False,
            "confidence_score": 0.0,
            "questions_to_ask": [],
            "memory_context_used": memory_context_used,
            "episodes_referenced": [],
        }


async def node_persist_results(
    state: EmailProcessingState, db_session=None
) -> EmailProcessingState:
    from src.data.clients.postgres import AsyncSessionLocal
    from src.data.repositories.repositories import (
        DisputeTypeRepository, DisputeRepository, EmailRepository,
        MemoryEpisodeRepository, OpenQuestionRepository, UserRepository,
    )
    from src.data.models.postgres.models import (
        DisputeMaster, DisputeAIAnalysis,
        DisputeMemoryEpisode, DisputeOpenQuestion,
        DisputeActivityLog, DisputeAssignment, EmailInbox,
    )
    from sqlalchemy import update as sa_update

    try:
        async with AsyncSessionLocal() as session:
            # 1. Resolve dispute type
            dtype_repo = DisputeTypeRepository(session)
            dispute_type = await dtype_repo.get_by_name(state["dispute_type_name"])
            if not dispute_type:
                dispute_type = await dtype_repo.get_by_name("General Clarification")

            dispute_id = state.get("existing_dispute_id")

            # 2. Create or reuse dispute
            if not dispute_id:
                dispute = DisputeMaster(
                    email_id=state["email_id"],
                    invoice_id=state.get("matched_invoice_id"),
                    payment_detail_id=state.get("matched_payment_id"),
                    customer_id=state["customer_id"] or "unknown",
                    dispute_type_id=dispute_type.dispute_type_id,
                    status="OPEN",
                    priority=state.get("priority", "MEDIUM"),
                    description=state.get("description", ""),
                )
                session.add(dispute)
                await session.flush()
                dispute_id = dispute.dispute_id
            else:
                log = DisputeActivityLog(
                    dispute_id=dispute_id,
                    action_type="FOLLOW_UP_EMAIL_RECEIVED",
                    notes=f"New email received: {state['subject'][:100]}",
                )
                session.add(log)

            # 3. AI analysis
            analysis = DisputeAIAnalysis(
                dispute_id=dispute_id,
                predicted_category=state["dispute_type_name"],
                confidence_score=state.get("confidence_score", 0.0),
                ai_summary=state.get("ai_summary", ""),
                ai_response=state.get("ai_response"),
                auto_response_generated=state.get("auto_response_generated", False),
                memory_context_used=state.get("memory_context_used", False),
                episodes_referenced=state.get("episodes_referenced") or [],
            )
            session.add(analysis)
            await session.flush()

            # 4. Memory episode – incoming email
            email_episode = DisputeMemoryEpisode(
                dispute_id=dispute_id,
                episode_type="CUSTOMER_EMAIL",
                actor="CUSTOMER",
                content_text=f"Subject: {state['subject']}\n\n{state['body_text'][:1000]}",
                email_id=state["email_id"],
            )
            session.add(email_episode)
            await session.flush()

            # 5. Memory episode – AI response
            if state.get("ai_response"):
                ai_episode = DisputeMemoryEpisode(
                    dispute_id=dispute_id,
                    episode_type="AI_RESPONSE",
                    actor="AI",
                    content_text=state["ai_response"],
                    email_id=state["email_id"],
                )
                session.add(ai_episode)
                await session.flush()

                answered_ids = state.get("_answers_pending_questions", [])
                if answered_ids:
                    q_repo = OpenQuestionRepository(session)
                    for qid in answered_ids:
                        q = await q_repo.get_by_id(qid)
                        if q and q.status == "PENDING":
                            q.status = "ANSWERED"
                            q.answered_in_episode_id = ai_episode.episode_id
                            q.answered_at = datetime.now(timezone.utc)

            # 6. Open questions
            for question_text in state.get("questions_to_ask", []):
                question = DisputeOpenQuestion(
                    dispute_id=dispute_id,
                    asked_in_episode_id=email_episode.episode_id,
                    question_text=question_text,
                    status="PENDING",
                )
                session.add(question)

            # 7. Update email routing
            email_repo = EmailRepository(session)
            await email_repo.update_status(state["email_id"], "PROCESSED")
            await session.execute(
                sa_update(EmailInbox)
                .where(EmailInbox.email_id == state["email_id"])
                .values(
                    dispute_id=dispute_id,
                    routing_confidence=state.get("routing_confidence", 0.0),
                )
            )

            # 8. Auto-assign if not auto-responded
            if not state.get("auto_response_generated"):
                user_repo = UserRepository(session)
                all_users = await user_repo.get_all(limit=10)
                if all_users:
                    assign = DisputeAssignment(
                        dispute_id=dispute_id,
                        assigned_to=all_users[0].user_id,
                        status="ACTIVE",
                    )
                    session.add(assign)

            await session.commit()

            analysis_id = analysis.analysis_id

        # 9. Trigger summarization (outside session)
        from src.data.clients.postgres import AsyncSessionLocal as ASL2
        from src.data.repositories.repositories import MemoryEpisodeRepository as MER
        async with ASL2() as s2:
            ep_repo = MER(s2)
            ep_count = await ep_repo.count_for_dispute(dispute_id)
        from src.config.settings import settings
        if ep_count >= settings.EPISODE_SUMMARIZE_THRESHOLD:
            from src.control.tasks import summarize_episodes_task
            summarize_episodes_task.delay(dispute_id)

        return {**state, "dispute_id": dispute_id, "analysis_id": analysis_id}

    except Exception as e:
        logger.error(f"Persist error for email_id={state['email_id']}: {e}", exc_info=True)
        # Try to mark email as failed
        try:
            from src.data.clients.postgres import AsyncSessionLocal as ASL3
            from src.data.repositories.repositories import EmailRepository as ER3
            async with ASL3() as s3:
                er = ER3(s3)
                await er.update_status(state["email_id"], "FAILED", str(e))
                await s3.commit()
        except Exception:
            pass
        return {**state, "error": str(e)}


# ─── Graph ────────────────────────────────────────────────────────────────────

def build_email_processing_graph(db_session=None, llm_client=None):
    from functools import partial

    graph = StateGraph(EmailProcessingState)

    # db_session param kept for signature compatibility but nodes use AsyncSessionLocal directly
    graph.add_node("extract_text",                  node_extract_text)
    graph.add_node("extract_invoice_data_via_groq", partial(node_extract_invoice_data_via_groq, llm_client=llm_client))
    graph.add_node("identify_invoice",              node_identify_invoice)
    graph.add_node("fetch_context",                 node_fetch_context)
    graph.add_node("classify_email",                partial(node_classify_email,       llm_client=llm_client))
    graph.add_node("generate_ai_response",          partial(node_generate_ai_response, llm_client=llm_client))
    graph.add_node("persist_results",               node_persist_results)

    graph.set_entry_point("extract_text")
    graph.add_edge("extract_text",                  "extract_invoice_data_via_groq")
    graph.add_edge("extract_invoice_data_via_groq", "identify_invoice")
    graph.add_edge("identify_invoice",              "fetch_context")
    graph.add_edge("fetch_context",                 "classify_email")
    graph.add_edge("classify_email",                "generate_ai_response")
    graph.add_edge("generate_ai_response",          "persist_results")
    graph.add_edge("persist_results",               END)

    return graph.compile()


async def run_email_processing(
    email_id: int,
    sender_email: str,
    subject: str,
    body_text: str,
    attachment_texts: List[str],
    db_session=None,
    llm_client=None,
) -> EmailProcessingState:
    graph = build_email_processing_graph(db_session=db_session, llm_client=llm_client)

    initial_state: EmailProcessingState = {
        "email_id": email_id,
        "sender_email": sender_email,
        "subject": subject,
        "body_text": body_text,
        "attachment_texts": attachment_texts,
        "all_text": "",
        "groq_extracted": None,
        "candidate_invoice_numbers": [],
        "matched_invoice_id": None,
        "matched_invoice_number": None,
        "matched_payment_id": None,
        "customer_id": None,
        "routing_confidence": 0.0,
        "invoice_details": None,
        "payment_details": None,
        "existing_dispute_id": None,
        "memory_summary": None,
        "recent_episodes": [],
        "pending_questions": [],
        "classification": "UNKNOWN",
        "dispute_type_name": "General Clarification",
        "priority": "MEDIUM",
        "description": "",
        "ai_summary": "",
        "ai_response": None,
        "confidence_score": 0.0,
        "auto_response_generated": False,
        "questions_to_ask": [],
        "memory_context_used": False,
        "episodes_referenced": [],
        "_answers_pending_questions": [],
        "dispute_id": None,
        "analysis_id": None,
        "error": None,
    }

    result = await graph.ainvoke(initial_state)
    return result
