import React from 'react';
import { Button } from '@mantine/core';

interface ActionButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  isValid?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
  className?: string;
}

/**
 * Standardized action buttons for dialog forms
 * Includes save, cancel, and optional delete buttons
 */
export function ActionButtons({
  onSave,
  onCancel,
  onDelete,
  isSubmitting = false,
  isValid = true,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  deleteLabel = 'Delete',
  className = ''
}: ActionButtonsProps) {
  return (
    <div className={`flex items-center justify-between mt-6 ${className}`}>
      <div>
        {onDelete && (
          <Button
            color="red"
            variant="subtle"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            {deleteLabel}
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          variant="subtle"
          color="gray"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
        
        <Button
          color="blue"
          onClick={onSave}
          loading={isSubmitting}
          disabled={isSubmitting || !isValid}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
} 