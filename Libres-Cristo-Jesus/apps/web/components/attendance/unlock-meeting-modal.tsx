'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@lcj/ui';

/**
 * Reopening a closed week (doc11 RN-407).
 *
 * The reason is REQUIRED and the copy says why: the reopening is recorded
 * with who did it, when, and until when, and an exception nobody can
 * explain a month later is not traceable — it is just an exception.
 */
export interface UnlockMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function UnlockMeetingModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  error,
}: UnlockMeetingModalProps) {
  const [reason, setReason] = useState('');

  // Clears on each opening so a previous attempt's text never travels with
  // the next reopening.
  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const trimmed = reason.trim();

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Reabrir la asistencia</ModalTitle>
          <ModalDescription>
            La reapertura dura 7 días calendario y queda registrada con su usuario, la fecha y el
            motivo. Pasado ese plazo la semana vuelve a bloquearse automáticamente.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="flex flex-col gap-3">
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
            >
              {error}
            </p>
          ) : null}

          <Input
            label="Motivo"
            required
            autoFocus
            placeholder="El líder reportó fuera de plazo"
            helperText="Quedará visible en la auditoría."
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
        </ModalBody>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            loading={loading}
            disabled={trimmed.length === 0}
            onClick={() => {
              onConfirm(trimmed);
            }}
          >
            Reabrir
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
