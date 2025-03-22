import React, { useState, KeyboardEvent } from 'react';
import { RiAddLine, RiCloseLine } from 'react-icons/ri';

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  className?: string;
}

/**
 * Reusable component for managing tags
 */
export default function TagInput({ tags, onAddTag, onRemoveTag, className = '' }: TagInputProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    onAddTag(tagInput.trim());
    setTagInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className={className}>
      <div className="text-[13px] text-gray-400 mb-2">TAGS</div>
      
      {/* Tag input */}
      <div className="flex mb-2">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag and press Enter"
          className="flex-1 bg-[#25262C] text-gray-200 text-[13px] border border-[#3D3E44] rounded-l px-3 py-1.5 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAddTag}
          className="bg-[#25262C] hover:bg-[#32343A] text-gray-400 px-3 py-1.5 rounded-r border-t border-r border-b border-[#3D3E44]"
        >
          <RiAddLine className="w-4 h-4" />
        </button>
      </div>
      
      {/* Tags display */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center bg-[#32343A] text-gray-300 rounded px-2 py-1 text-[12px]"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="ml-1.5 text-gray-400 hover:text-gray-200"
            >
              <RiCloseLine className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {tags.length === 0 && (
          <div className="text-[12px] text-gray-500">No tags added</div>
        )}
      </div>
    </div>
  );
} 