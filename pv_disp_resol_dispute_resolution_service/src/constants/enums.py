from enum import Enum


class DisputeStatus(str, Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class DisputePriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AssignmentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    REASSIGNED = "REASSIGNED"
    COMPLETED = "COMPLETED"


class MatchStatus(str, Enum):
    FULL = "FULL"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class ProcessingStatus(str, Enum):
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class EpisodeType(str, Enum):
    CUSTOMER_EMAIL = "CUSTOMER_EMAIL"
    AI_RESPONSE = "AI_RESPONSE"
    ASSOCIATE_RESPONSE = "ASSOCIATE_RESPONSE"
    ATTACHMENT_PARSED = "ATTACHMENT_PARSED"
    STATUS_CHANGE = "STATUS_CHANGE"
    CLARIFICATION_ASKED = "CLARIFICATION_ASKED"


class Actor(str, Enum):
    CUSTOMER = "CUSTOMER"
    AI = "AI"
    ASSOCIATE = "ASSOCIATE"
    SYSTEM = "SYSTEM"


class QuestionStatus(str, Enum):
    PENDING = "PENDING"
    ANSWERED = "ANSWERED"
    EXPIRED = "EXPIRED"


class EmailClassification(str, Enum):
    DISPUTE = "DISPUTE"
    CLARIFICATION = "CLARIFICATION"
    UNKNOWN = "UNKNOWN"


class TaskNames:
    PROCESS_EMAIL = "src.control.tasks.process_email_task"
    SUMMARIZE_EPISODES = "src.control.tasks.summarize_episodes_task"
    MATCH_INVOICE = "src.control.tasks.match_invoice_task"
