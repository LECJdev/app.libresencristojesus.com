'use client';

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@lcj/ui';

/**
 * Destructive-action confirmation (doc18 §17: a Modal is for short,
 * blocking decisions — which is exactly this, and exactly not a form).
 *
 * Generic on purpose: Distritos, Casas de Paz and every later module
 * confirm deletions identically, and three near-copies of this dialog is
 * how the wording and the button order start disagreeing.
 *
 * "Delete" here means the soft delete the backend performs (doc07 US-009:
 * "No elimina. Solo cambia estado."), which is why the copy says the
 * record is deactivated rather than destroyed — promising erasure that
 * does not happen is worse than saying nothing.
 */
export interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being deactivated, e.g. "Distrito 09". */
  itemName: string;
  /** Noun for the copy, e.g. "el distrito". */
  itemLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  /** Server-side reason the deletion was refused, e.g. an active child. */
  error?: string | null;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  itemName,
  itemLabel,
  onConfirm,
  loading = false,
  error,
}: ConfirmDeleteModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Eliminar {itemLabel}</ModalTitle>
          <ModalDescription>
            ¿Confirma que desea eliminar <strong>{itemName}</strong>? El registro se marcará como
            inactivo y dejará de aparecer en los listados, pero su información y su historial se
            conservan.
          </ModalDescription>
        </ModalHeader>

        {error ? (
          <ModalBody>
            <p
              role="alert"
              className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
            >
              {error}
            </p>
          </ModalBody>
        ) : null}

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button loading={loading} onClick={onConfirm}>
            Eliminar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
