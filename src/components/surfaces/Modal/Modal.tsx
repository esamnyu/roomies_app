import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusTrap } from '@/components/accessibility';
import { Button } from '@/components/primitives/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  showCloseButton = true,
  className,
}) => {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);
  
  if (!mounted) return null;
  
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-modal flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={closeOnBackdropClick ? onClose : undefined}
            aria-hidden="true"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className={cn(
              'relative w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
              sizeClasses[size],
              'max-h-[90vh] sm:max-h-[85vh]',
              className
            )}
          >
            <FocusTrap active={isOpen}>
              <div className="flex max-h-[90vh] flex-col sm:max-h-[85vh]">
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between border-b border-secondary-200 px-4 py-3 sm:px-6 sm:py-4">
                    <div>
                      {title && (
                        <h2
                          id="modal-title"
                          className="text-lg font-semibold text-secondary-900"
                        >
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p
                          id="modal-description"
                          className="mt-1 text-sm text-secondary-600"
                        >
                          {description}
                        </p>
                      )}
                    </div>
                    {showCloseButton && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="ml-4 h-9 w-9 rounded-full"
                        aria-label="Close modal"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  {children}
                </div>
              </div>
            </FocusTrap>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};