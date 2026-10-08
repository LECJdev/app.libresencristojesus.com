'use client';

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Input,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@lcj/ui';

export function OverlaysSection() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Modal</h3>
        <p className="text-small text-foreground-muted">
          Reservado para confirmaciones y decisiones cortas — nunca formularios largos.
        </p>
        <Modal>
          <ModalTrigger asChild>
            <Button variant="secondary">Abrir modal</Button>
          </ModalTrigger>
          <ModalContent size="sm">
            <ModalHeader>
              <ModalTitle>Eliminar registro</ModalTitle>
              <ModalDescription>Esta acción no se puede deshacer.</ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </ModalClose>
              <ModalClose asChild>
                <Button variant="primary">Eliminar</Button>
              </ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Drawer</h3>
        <p className="text-small text-foreground-muted">
          Reservado para formularios reales y vistas de detalle (Persona, Casa de Paz, Reunión,
          Distrito).
        </p>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="secondary">Abrir drawer</Button>
          </DrawerTrigger>
          <DrawerContent side="right" size="md">
            <DrawerHeader>
              <DrawerTitle>Nueva Persona</DrawerTitle>
              <DrawerDescription>Formulario de ejemplo, sin lógica real.</DrawerDescription>
            </DrawerHeader>
            <DrawerBody>
              <div className="flex flex-col gap-4">
                <Input label="Nombre" placeholder="Nombre completo" />
                <Input label="Teléfono" placeholder="300 000 0000" />
              </div>
            </DrawerBody>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button variant="primary">Guardar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
