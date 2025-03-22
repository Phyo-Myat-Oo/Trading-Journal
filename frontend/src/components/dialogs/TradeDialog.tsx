import { useState, Fragment, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { RiCloseLine, RiAddLine, RiSave3Line, RiImageAddLine, RiDeleteBin6Line, RiArrowLeftLine, RiArrowRightLine } from 'react-icons/ri';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { createPortal } from 'react-dom';

interface TradeEntry {
  action: 'BUY' | 'SELL';
  datetime: string;
  quantity: number | '';
  price: number | '';
  fee: number | '';
}

export interface TradeData {
  market: string;
  symbol: string;
  target: string;
  stopLoss: string;
  side: 'LONG' | 'SHORT';
  entries: TradeEntry[];
  tags: string[];
  notes: string;
  confidence: number;
  screenshots: string[];
}

interface TradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TradeData) => void;
  className?: string;
}

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

// Custom styles to ensure the dialog appears on top of other elements
const dialogStyles = {
  zIndex: 100000, // Extremely high z-index to appear above other elements
};

export function TradeDialog({ isOpen, onClose, onSave, className = '' }: TradeDialogProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'journal'>('general');
  const [formData, setFormData] = useState<TradeData>({
    market: 'OPTION',
    symbol: '',
    target: '',
    stopLoss: '',
    side: 'LONG',
    entries: [
      {
        action: 'BUY',
        datetime: new Date().toISOString().slice(0, 16),
        quantity: '',
        price: '',
        fee: 0
      }
    ],
    tags: [],
    notes: '',
    confidence: 0,
    screenshots: []
  });
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Reset form when dialog is opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      market: 'OPTION',
      symbol: '',
      target: '',
      stopLoss: '',
      side: 'LONG',
      entries: [
        {
          action: 'BUY',
          datetime: new Date().toISOString().slice(0, 16),
          quantity: '',
          price: '',
          fee: 0
        }
      ],
      tags: [],
      notes: '',
      confidence: 0,
      screenshots: []
    });
    setTouchedFields(new Set());
    setTagInput('');
    setIsFormValid(false);
    setSelectedImageIndex(null);
    setActiveTab('general');
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.symbol.trim()) return false;
    
    // Validate entries
    const hasValidEntries = formData.entries.every(entry => {
      const quantityValid = entry.quantity === '' ? false : Number(entry.quantity) > 0;
      const priceValid = entry.price === '' ? false : Number(entry.price) > 0;
      return quantityValid && priceValid;
    });
    
    const isValid = formData.symbol.trim() !== '' && hasValidEntries;
    setIsFormValid(isValid);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (name === 'target' || name === 'stopLoss') {
      if (value === '' || value === '.') {
        setFormData(prev => ({ ...prev, [name]: value }));
      } else if (value.match(/^\d{0,11}(\.\d{0,4})?$/)) {
        // Allow up to 11 digits before decimal and 4 after
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setTouchedFields(prev => new Set(prev).add(name));
    setTimeout(validateForm, 300);
  };

  const handleEntryChange = (index: number, field: keyof TradeEntry, value: string | number) => {
    setFormData(prev => {
      const updatedEntries = [...prev.entries];
      
      if (field === 'quantity' || field === 'price' || field === 'fee') {
        if (value === '' || value === '.') {
          updatedEntries[index] = { ...updatedEntries[index], [field]: value };
        } else if (typeof value === 'string' && value.match(/^\d{0,11}(\.\d{0,4})?$/)) {
          // Allow up to 11 digits before decimal and 4 after
          updatedEntries[index] = { ...updatedEntries[index], [field]: value };
        }
      } else {
        updatedEntries[index] = { ...updatedEntries[index], [field]: value };
      }
      
      return { ...prev, entries: updatedEntries };
    });
    
    setTouchedFields(prev => new Set(prev).add(`entries.${index}.${field}`));
    setTimeout(validateForm, 300);
  };

  const handleAddEntry = () => {
    // Add new entry with values based on the last entry
    const lastEntry = formData.entries[formData.entries.length - 1];
    const newAction = lastEntry.action === 'BUY' ? 'SELL' : 'BUY';
    
    setFormData(prev => ({
      ...prev,
      entries: [
        ...prev.entries,
        {
          action: newAction,
          datetime: new Date().toISOString().slice(0, 16),
          quantity: lastEntry.quantity, // Copy quantity from last entry for convenience
          price: 0,
          fee: 0
        }
      ]
    }));
    
    setTimeout(validateForm, 300);
  };

  const handleRemoveEntry = (index: number) => {
    if (formData.entries.length <= 1) return;
    
    setFormData(prev => {
      const updatedEntries = prev.entries.filter((_, i) => i !== index);
      return { ...prev, entries: updatedEntries };
    });
    
    setTimeout(validateForm, 300);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    // Don't add duplicates
    if (formData.tags.includes(tagInput.trim())) {
      setTagInput('');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()]
    }));
    
    setTagInput('');
  };
  
  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      
      // Just pass the form data as is, since we've been validating it all along
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving trade:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSideChange = (side: 'LONG' | 'SHORT') => {
    setFormData(prev => ({ ...prev, side }));
  };

  const toggleAction = (index: number) => {
    handleEntryChange(index, 'action', formData.entries[index].action === 'BUY' ? 'SELL' : 'BUY');
  };

  const isFieldTouched = (field: string) => touchedFields.has(field);
  const isEntryFieldTouched = (index: number, field: string) => touchedFields.has(`entries.${index}.${field}`);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newScreenshots = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, ...newScreenshots] }));
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    const newScreenshots = formData.screenshots.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, screenshots: newScreenshots }));
  };

  const handleImageClick = (index: number) => {
    console.log('Image clicked:', index);
    setSelectedImageIndex(index);
  };

  const handleCloseImageViewer = () => {
    setSelectedImageIndex(null);
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < formData.screenshots.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  // Force dialog to highest z-index
  useEffect(() => {
    if (isOpen) {
      // Add a small delay to ensure the dialog is added to the DOM before we try to modify it
      const timeoutId = setTimeout(() => {
        // Find all dialog elements and set their z-index to a very high value
        const dialogElements = document.querySelectorAll('[role="dialog"]');
        dialogElements.forEach(dialog => {
          (dialog as HTMLElement).style.zIndex = '100000';
        });
        
        // Also set the backdrop z-index
        const backdropElements = document.querySelectorAll('.fixed.inset-0.bg-black');
        backdropElements.forEach(backdrop => {
          (backdrop as HTMLElement).style.zIndex = '99999';
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className={`relative z-[10000] ${className}`} onClose={onClose} style={dialogStyles}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl bg-[#1C1E26] rounded-lg shadow-xl overflow-hidden">
                <div className="flex items-center justify-between bg-[#21242E] px-6 py-4 border-b border-[#2C2F3A]">
                  <div className="flex items-center gap-8">
                    <Dialog.Title className="text-lg font-medium text-white">
                      New Trade
                    </Dialog.Title>
                    <div className="flex gap-6">
                      <button
                        className={`py-1 text-center transition-colors relative ${
                          activeTab === 'general'
                            ? 'text-white font-medium'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setActiveTab('general')}
                      >
                        General
                        {activeTab === 'general' && (
                          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>
                        )}
                      </button>
                      <button
                        className={`py-1 text-center transition-colors relative ${
                          activeTab === 'journal'
                            ? 'text-white font-medium'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setActiveTab('journal')}
                      >
                        Journal
                        {activeTab === 'journal' && (
                          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-white transition-colors"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <RiCloseLine className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="relative min-h-[500px]">
                    <div 
                      className={`absolute w-full transition-all duration-300 ease-in-out ${
                        activeTab === 'general' 
                          ? 'translate-x-0 opacity-100' 
                          : '-translate-x-4 opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="space-y-6">
                        {/* Trade Info */}
                        <div className="grid grid-cols-5 gap-4">
                          <div className="col-span-1">
                            <label className="block text-gray-400 text-sm mb-1.5">Market</label>
                            <select
                              name="market"
                              value={formData.market}
                              onChange={handleInputChange}
                              className="w-full bg-[#2A2D39] text-white rounded-md border border-[#3A3D4A] px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value="STOCK">STOCK</option>
                              <option value="OPTION">OPTION</option>
                              <option value="CRYPTO">CRYPTO</option>
                              <option value="FOREX">FOREX</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="block text-gray-400 text-sm mb-1.5">
                              Symbol <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              name="symbol"
                              value={formData.symbol}
                              onChange={handleInputChange}
                              className="w-full bg-[#2A2D39] text-white rounded-md border border-[#3A3D4A] px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Ex: AAPL"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-gray-400 text-sm mb-1.5">Target</label>
                            <input
                              type="text"
                              name="target"
                              value={formData.target}
                              onChange={handleInputChange}
                              className={`w-full bg-[#2A2D39] text-white rounded-md border px-3 py-2.5 focus:outline-none focus:ring-1 transition-colors ${
                                isFieldTouched('target') && formData.target !== '' && isNaN(parseFloat(formData.target))
                                  ? 'border-red-500/50 focus:ring-red-500'
                                  : 'border-[#3A3D4A] focus:ring-blue-500'
                              }`}
                              placeholder="Price target"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-gray-400 text-sm mb-1.5">Stop-Loss</label>
                            <input
                              type="text"
                              name="stopLoss"
                              value={formData.stopLoss}
                              onChange={handleInputChange}
                              className={`w-full bg-[#2A2D39] text-white rounded-md border px-3 py-2.5 focus:outline-none focus:ring-1 transition-colors ${
                                isFieldTouched('stopLoss') && formData.stopLoss !== '' && isNaN(parseFloat(formData.stopLoss))
                                  ? 'border-red-500/50 focus:ring-red-500'
                                  : 'border-[#3A3D4A] focus:ring-blue-500'
                              }`}
                              placeholder="Stop-loss price"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-gray-400 text-sm mb-1.5">Side</label>
                            <button
                              onClick={() => handleSideChange(formData.side === 'LONG' ? 'SHORT' : 'LONG')}
                              className={`w-full text-white rounded-md border px-3 py-2.5 focus:outline-none focus:ring-1 transition-colors ${
                                formData.side === 'LONG'
                                  ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                                  : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                              }`}
                            >
                              {formData.side}
                            </button>
                          </div>
                        </div>

                        {/* Entry Table */}
                        <div>
                          <div className="grid grid-cols-5 bg-[#21242E] rounded-t-md py-3 px-4 text-sm text-gray-200 font-medium">
                            <div className="col-span-1">Action</div>
                            <div className="col-span-1">Date/ Time</div>
                            <div className="col-span-1">Quantity</div>
                            <div className="col-span-1">Price</div>
                            <div className="col-span-1">Fee</div>
                          </div>

                          <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {formData.entries.map((entry, index) => (
                              <div key={index} className="grid grid-cols-5 gap-2 items-center">
                                <div className="col-span-1 flex">
                                  <button
                                    className="bg-red-500/20 text-red-400 p-1 rounded-full mr-2 hover:bg-red-500/30 transition-colors"
                                    onClick={() => handleRemoveEntry(index)}
                                    aria-label="Remove entry"
                                    disabled={formData.entries.length <= 1}
                                  >
                                    <RiCloseLine className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => toggleAction(index)}
                                    className={`flex-1 text-white rounded-md border px-3 py-2 focus:outline-none focus:ring-1 transition-colors ${
                                      entry.action === 'BUY' 
                                        ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' 
                                        : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                    }`}
                                  >
                                    {entry.action}
                                  </button>
                                </div>
                                <div className="col-span-1">
                                  <input
                                    type="datetime-local"
                                    value={entry.datetime}
                                    onChange={(e) => handleEntryChange(index, 'datetime', e.target.value)}
                                    className="w-full bg-[#2A2D39] text-white rounded-md border border-[#3A3D4A] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                                    required
                                  />
                                </div>
                                <div className="col-span-1">
                                  <input
                                    type="text"
                                    value={entry.quantity}
                                    onChange={(e) => handleEntryChange(index, 'quantity', e.target.value)}
                                    className={`w-full bg-[#2A2D39] text-white rounded-md border px-3 py-2 focus:outline-none focus:ring-1 transition-colors ${
                                      isEntryFieldTouched(index, 'quantity') && entry.quantity === ''
                                        ? 'border-red-500/50 focus:ring-red-500' 
                                        : 'border-[#3A3D4A] focus:ring-blue-500'
                                    }`}
                                    placeholder="Enter quantity"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                    <input
                                      type="text"
                                      value={entry.price}
                                      onChange={(e) => handleEntryChange(index, 'price', e.target.value)}
                                      className={`w-full bg-[#2A2D39] text-white rounded-md border pl-7 pr-3 py-2 focus:outline-none focus:ring-1 transition-colors ${
                                        isEntryFieldTouched(index, 'price') && entry.price === ''
                                          ? 'border-red-500/50 focus:ring-red-500' 
                                          : 'border-[#3A3D4A] focus:ring-blue-500'
                                      }`}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-1">
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                    <input
                                      type="text"
                                      value={entry.fee}
                                      onChange={(e) => handleEntryChange(index, 'fee', e.target.value)}
                                      className="w-full bg-[#2A2D39] text-white rounded-md border border-[#3A3D4A] pl-7 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Entry Button */}
                          <button
                            type="button"
                            onClick={handleAddEntry}
                            className="mt-3 w-full flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md py-2.5 hover:bg-blue-500/20 transition-colors"
                          >
                            <RiAddLine className="w-5 h-5 mr-2" />
                            <span>Add Entry</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`absolute w-full transition-all duration-300 ease-in-out ${
                        activeTab === 'journal' 
                          ? 'translate-x-0 opacity-100' 
                          : 'translate-x-4 opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="space-y-6">
                        {/* Tags */}
                        <div>
                          <label className="block text-gray-400 text-sm mb-1.5">Tags</label>
                          <div className="h-8 mb-2 flex flex-wrap gap-2 content-start overflow-y-auto custom-scrollbar">
                            {formData.tags.map((tag, index) => (
                              <div 
                                key={index}
                                className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center text-sm"
                              >
                                <span>{tag}</span>
                                <button 
                                  className="ml-2 hover:text-white transition-colors"
                                  onClick={() => handleRemoveTag(tag)}
                                >
                                  <RiCloseLine className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex">
                            <input
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                              className="flex-1 bg-[#2A2D39] text-white rounded-l-md border border-[#3A3D4A] px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Add tags (press Enter to add)"
                            />
                            <button
                              type="button"
                              onClick={handleAddTag}
                              className="bg-blue-500 text-white px-3 py-2.5 rounded-r-md hover:bg-blue-600 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            Suggested: #breakout #pivot #earnings #trend
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-gray-400 text-sm mb-1.5">Notes</label>
                          <div className="bg-[#2A2D39] rounded-md border border-[#3A3D4A] overflow-hidden mb-2">
                            <div className="bg-[#21242E] border-b border-[#3A3D4A]">
                              <ReactQuill
                                theme="snow"
                                value={formData.notes}
                                onChange={(content) => setFormData(prev => ({ ...prev, notes: content }))}
                                className="h-[200px]"
                                modules={{
                                  toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline'],
                                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                    ['link', 'image']
                                  ],
                                  clipboard: {
                                    matchVisual: false
                                  }
                                }}
                                formats={[
                                  'header',
                                  'bold', 'italic', 'underline',
                                  'list', 'bullet',
                                  'link', 'image'
                                ]}
                                placeholder="Trade setup, rationale, observations..."
                              />
                            </div>
                          </div>
                          <style>{`
                            .ql-container {
                              height: 120px !important;
                              background: #2A2D39 !important;
                              color: white !important;
                              border: none !important;
                              font-size: 14px !important;
                              line-height: 1.5 !important;
                            }
                            .ql-editor {
                              color: white !important;
                              padding: 12px !important;
                              min-height: 120px !important;
                            }
                            .ql-editor.ql-blank::before {
                              color: #6B7280 !important;
                              font-style: normal !important;
                              font-size: 14px !important;
                            }
                            .ql-toolbar {
                              background: #21242E !important;
                              border: none !important;
                              border-bottom: 1px solid #3A3D4A !important;
                              padding: 8px !important;
                              min-height: 48px !important;
                            }
                            .ql-toolbar button {
                              width: 32px !important;
                              height: 32px !important;
                              color: #9CA3AF !important;
                              background: transparent !important;
                              border: 1px solid #3A3D4A !important;
                              padding: 6px !important;
                              margin: 0 2px !important;
                              border-radius: 4px !important;
                              display: inline-flex !important;
                              align-items: center !important;
                              justify-content: center !important;
                            }
                            .ql-toolbar button:hover {
                              color: white !important;
                              background: #3A3D4A !important;
                              border-color: #4B5563 !important;
                            }
                            .ql-toolbar button.ql-active {
                              color: white !important;
                              background: #3A3D4A !important;
                              border-color: #60A5FA !important;
                            }
                            .ql-toolbar .ql-stroke {
                              stroke: currentColor !important;
                              stroke-width: 1.25 !important;
                              stroke-linecap: round !important;
                              stroke-linejoin: round !important;
                            }
                            .ql-toolbar .ql-fill {
                              fill: currentColor !important;
                            }
                            .ql-toolbar .ql-picker {
                              color: #9CA3AF !important;
                              height: 32px !important;
                            }
                            .ql-toolbar .ql-picker-label {
                              border: 1px solid #3A3D4A !important;
                              border-radius: 4px !important;
                              padding: 6px 10px !important;
                              display: flex !important;
                              align-items: center !important;
                              font-size: 13px !important;
                            }
                            .ql-toolbar .ql-picker-label:hover {
                              color: white !important;
                              border-color: #4B5563 !important;
                            }
                            .ql-toolbar .ql-picker-options {
                              background: #2A2D39 !important;
                              color: white !important;
                              border: 1px solid #3A3D4A !important;
                              border-radius: 4px !important;
                              padding: 6px !important;
                              margin-top: 4px !important;
                              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
                            }
                            .ql-toolbar .ql-picker-item {
                              color: #9CA3AF !important;
                              padding: 6px 10px !important;
                              border-radius: 4px !important;
                              font-size: 13px !important;
                            }
                            .ql-toolbar .ql-picker-item:hover {
                              color: white !important;
                              background: #3A3D4A !important;
                            }
                            .ql-toolbar .ql-picker-item.ql-selected {
                              color: #60A5FA !important;
                              background: #3A3D4A !important;
                            }
                            .ql-formats {
                              display: inline-flex !important;
                              align-items: center !important;
                              margin-right: 12px !important;
                            }
                            .ql-formats:last-child {
                              margin-right: 0 !important;
                            }
                            .ql-editor a {
                              color: #60A5FA !important;
                            }
                            .ql-editor a:hover {
                              text-decoration: underline !important;
                            }
                            .ql-editor img {
                              max-width: 100% !important;
                              height: auto !important;
                              border-radius: 6px !important;
                              margin: 8px 0 !important;
                            }
                            .ql-editor p {
                              margin: 0 !important;
                            }
                          `}</style>
                        </div>

                        {/* Confidence and Screenshots Grid */}
                        <div className="grid grid-cols-2 gap-6">
                          {/* Confidence Slider */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-gray-200 font-medium">Confidence</label>
                              <span className={`text-lg font-semibold ${
                                formData.confidence < 4 ? 'text-red-400' : 
                                formData.confidence < 7 ? 'text-yellow-400' : 'text-green-400'
                              }`}>
                                {formData.confidence}
                              </span>
                            </div>
                            <div className="flex items-center mb-1">
                              <input
                                type="range"
                                name="confidence"
                                min="0"
                                max="10"
                                value={formData.confidence}
                                onChange={handleInputChange}
                                className="w-full h-2 bg-[#3A3D4A] rounded-lg appearance-none cursor-pointer transition-colors"
                                style={{
                                  background: `linear-gradient(to right, 
                                    ${formData.confidence < 4 ? '#f87171' : formData.confidence < 7 ? '#facc15' : '#4ade80'} 0%, 
                                    ${formData.confidence < 4 ? '#f87171' : formData.confidence < 7 ? '#facc15' : '#4ade80'} ${formData.confidence * 10}%, 
                                    #3A3D4A ${formData.confidence * 10}%, 
                                    #3A3D4A 100%)`
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Not Confident</span>
                              <span>Very Confident</span>
                            </div>
                          </div>

                          {/* Screenshots */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <label className="text-gray-200 font-medium">Screenshots</label>
                              <label className="cursor-pointer bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md px-1.5 py-0.5 text-xs hover:bg-blue-500/20 transition-colors">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleScreenshotUpload}
                                  className="hidden"
                                />
                                <div className="flex items-center">
                                  <RiImageAddLine className="w-3 h-3 mr-0.5" />
                                  <span>Add</span>
                                </div>
                              </label>
                            </div>

                            {formData.screenshots.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap">
                                {formData.screenshots.slice(0, 5).map((screenshot, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={screenshot}
                                      alt={`Screenshot ${index + 1}`}
                                      className="w-12 h-12 object-cover rounded-md border border-[#3A3D4A] cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleImageClick(index);
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveScreenshot(index);
                                      }}
                                      className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <RiDeleteBin6Line className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                                
                                {formData.screenshots.length > 5 && (
                                  <div 
                                    className="w-12 h-12 flex items-center justify-center bg-[#2A2D39] rounded-md border border-[#3A3D4A] text-gray-300 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImageClick(5);
                                    }}
                                  >
                                    +{formData.screenshots.length - 5}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-[#21242E] px-6 py-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSaving}
                    className={`flex items-center px-6 py-2.5 rounded-md font-medium transition-colors ${
                      isFormValid && !isSaving
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'bg-blue-500/50 text-white/70 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <RiSave3Line className="mr-2" />
                        <span>Save Trade</span>
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {/* Image Viewer - Using Portal to render at document root */}
      {selectedImageIndex !== null && 
        createPortal(
          <ImageViewer
            images={formData.screenshots}
            currentIndex={selectedImageIndex}
            onClose={handleCloseImageViewer}
            onPrevious={handlePreviousImage}
            onNext={handleNextImage}
          />,
          document.body
        )
      }
    </Transition>
  );
}

function ImageViewer({ images, currentIndex, onClose, onPrevious, onNext }: ImageViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Focus the viewer container when it opens to enable keyboard navigation
    if (viewerRef.current) {
      viewerRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    switch (e.key) {
      case 'ArrowLeft':
        onPrevious();
        break;
      case 'ArrowRight':
        onNext();
        break;
      case 'Escape':
        onClose();
        break;
      default:
        break;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      ref={viewerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      tabIndex={0}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
      >
        <RiCloseLine className="w-8 h-8" />
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrevious();
        }}
        disabled={currentIndex === 0}
        className="absolute left-4 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RiArrowLeftLine className="w-8 h-8" />
      </button>
      
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img
          src={images[currentIndex]}
          alt={`Screenshot ${currentIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={currentIndex === images.length - 1}
        className="absolute right-4 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RiArrowRightLine className="w-8 h-8" />
      </button>
      
      <div className="absolute bottom-4 text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
} 