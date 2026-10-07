import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

export const BottomSheet = ({ open, onOpenChange, title, children, testId }) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent data-testid={testId} className="bg-[#0F172A] border-[#1E293B] text-white max-h-[92vh] font-body">
      <DrawerHeader className="text-left pb-2">
        <DrawerTitle className="font-heading text-xl text-white">{title}</DrawerTitle>
        <DrawerDescription className="sr-only">{title}</DrawerDescription>
      </DrawerHeader>
      <div className="overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
    </DrawerContent>
  </Drawer>
);
