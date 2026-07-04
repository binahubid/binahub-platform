// ============================================
// EVENT TYPES
// ============================================

export type EventStatus = 'pending' | 'processing' | 'done' | 'failed';
export type AggregateType = 'associate' | 'file' | 'review';

export interface EventQueue {
  id: string;
  type: string;
  aggregateType: AggregateType;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: EventStatus;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  availableAt: string;
  createdAt: string;
  processedAt: string | null;
}

// ============================================
// EVENT TYPES (Specific)
// ============================================

export type EventType =
  | 'AssociateCreated'
  | 'AssociateSubmitted'
  | 'AssociateApproved'
  | 'AssociateRejected'
  | 'AssociateSuspended'
  | 'AssociateReactivated'
  | 'ProfileUpdated'
  | 'CVUploaded'
  | 'DocumentUploaded'
  | 'SearchSyncNeeded';

// ============================================
// EVENT PAYLOADS
// ============================================

export interface AssociateCreatedPayload {
  associateId: string;
  email: string;
  fullName: string;
}

export interface AssociateSubmittedPayload {
  associateId: string;
  submittedAt: string;
}

export interface AssociateApprovedPayload {
  associateId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface AssociateRejectedPayload {
  associateId: string;
  rejectedBy: string;
  reason?: string;
}

export interface CVUploadedPayload {
  associateId: string;
  fileId: string;
  fileName: string;
}

export interface SearchSyncPayload {
  entityType: string;
  entityId: string;
  action: 'index' | 'update' | 'delete';
}

// ============================================
// SEARCH SYNC LOG
// ============================================

export type SyncAction = 'index' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface SearchSyncLog {
  id: string;
  entityType: string;
  entityId: string;
  action: SyncAction;
  status: SyncStatus;
  createdAt: string;
  syncedAt: string | null;
}
