import { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { RiCloseLine } from 'react-icons/ri';

export interface TradeSetupData {
  side: 'LONG' | 'SHORT';
  market: string;
  symbol: string;
  entry: string;
  target: string;
  stopLoss: string;
  note: string;
  tags: string[];
}

interface TradeSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TradeSetupData) => void;
}

export function TradeSetupDialog({ isOpen, onClose, onSave }: TradeSetupDialogProps) {
  const [formData, setFormData] = useState<TradeSetupData>({
    side: 'LONG',
    market: 'STOCK',
    symbol: '',
    entry: '',
    target: '',
    stopLoss: '',
    note: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [riskRewardRatio, setRiskRewardRatio] = useState<string | null>(null);
  const [winRate, setWinRate] = useState<string | null>(null);
  
  // Reset form when dialog is opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);
  
  // Calculate Risk/Reward ratio whenever relevant fields change
  useEffect(() => {
    calculateRiskRewardRatio();
  }, [formData.entry, formData.target, formData.stopLoss, formData.side]);

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      side: 'LONG',
      market: 'STOCK',
      symbol: '',
      entry: '',
      target: '',
      stopLoss: '',
      note: '',
      tags: []
    });
    setTagInput('');
    setTouchedFields(new Set());
    setIsFormValid(false);
    setRiskRewardRatio(null);
    setWinRate(null);
  };
  
  // Calculate Risk/Reward ratio
  const calculateRiskRewardRatio = () => {
    const entry = parseFloat(formData.entry);
    const target = parseFloat(formData.target);
    const stopLoss = parseFloat(formData.stopLoss);
    
    if (isNaN(entry) || isNaN(target) || isNaN(stopLoss) || entry === 0) {
      setRiskRewardRatio(null);
      setWinRate(null);
      return;
    }
    
    let reward, risk;
    
    if (formData.side === 'LONG') {
      reward = target - entry;
      risk = entry - stopLoss;
    } else {
      reward = entry - target;
      risk = stopLoss - entry;
    }
    
    // Check if risk and reward are valid
    if (risk <= 0 || reward <= 0) {
      setRiskRewardRatio(null);
      setWinRate(null);
      return;
    }
    
    const ratio = reward / risk;
    
    // Format as 1:X.XX
    const formattedRatio = `1:${ratio.toFixed(2)}`;
    setRiskRewardRatio(formattedRatio);
    
    // Calculate required win rate for profitability
    // Win rate = risk / (risk + reward)
    const requiredWinRate = (risk / (risk + reward)) * 100;
    setWinRate(`Win above ${Math.ceil(requiredWinRate)}% of trades to be profitable`);
  };

  const validateForm = () => {
    // Check required fields (at minimum we need a symbol)
    const isValid = formData.symbol.trim() !== '';
    setIsFormValid(isValid);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (name === 'entry' || name === 'target' || name === 'stopLoss') {
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

  const handleSideChange = (side: 'LONG' | 'SHORT') => {
    setFormData(prev => ({ ...prev, side }));
  };

  const isFieldTouched = (field: string) => touchedFields.has(field);

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
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving trade setup:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-lg bg-[#1A1B23] rounded-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#1A1B23] border-b border-gray-800">
                  <Dialog.Title className="text-[15px] text-gray-100">
                    New Trade Setup
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                    onClick={onClose}
                  >
                    <RiCloseLine className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                  {/* Row 1: Side, Market, Symbol */}
                  <div>
                    <div className="text-[13px] text-gray-400 mb-2">SIDE</div>
                    <div className="flex mb-5">
                      <button
                        onClick={() => handleSideChange('LONG')}
                        className={`flex-1 py-1.5 text-[13px] rounded-l ${
                          formData.side === 'LONG'
                            ? 'bg-[#4CAF50] text-white'
                            : 'bg-[#25262C] text-gray-400'
                        }`}
                      >
                        LONG
                      </button>
                      <button
                        onClick={() => handleSideChange('SHORT')}
                        className={`flex-1 py-1.5 text-[13px] rounded-r ${
                          formData.side === 'SHORT'
                            ? 'bg-[#EF5350] text-white'
                            : 'bg-[#25262C] text-gray-400'
                        }`}
                      >
                        SHORT
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                      {/* Market */}
                      <div>
                        <div className="text-[13px] text-gray-400 mb-2">MARKET</div>
                        <select
                          name="market"
                          value={formData.market}
                          onChange={handleInputChange}
                          className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none appearance-none"
                        >
                          <option value="STOCK">STOCK</option>
                          <option value="OPTION">OPTION</option>
                          <option value="CRYPTO">CRYPTO</option>
                          <option value="FOREX">FOREX</option>
                        </select>
                      </div>

                      {/* Symbol */}
                      <div>
                        <div className="text-[13px] text-gray-400 mb-2">SYMBOL</div>
                        <input
                          type="text"
                          name="symbol"
                          value={formData.symbol}
                          onChange={handleInputChange}
                          className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none placeholder:text-gray-600"
                          placeholder="Enter symbol"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Entry, Target, Stop-Loss */}
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {/* Entry */}
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">ENTRY</div>
                      <input
                        type="text"
                        name="entry"
                        value={formData.entry}
                        onChange={handleInputChange}
                        className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none placeholder:text-gray-600"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Target */}
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">TARGET</div>
                      <input
                        type="text"
                        name="target"
                        value={formData.target}
                        onChange={handleInputChange}
                        className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none placeholder:text-gray-600"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Stop-Loss */}
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">STOP-LOSS</div>
                      <input
                        type="text"
                        name="stopLoss"
                        value={formData.stopLoss}
                        onChange={handleInputChange}
                        className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none placeholder:text-gray-600"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Row 3: Risk/Reward and Note */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Risk/Reward Ratio */}
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">RISK/REWARD</div>
                      <div className="bg-[#2A3A56] h-[80px] flex flex-col justify-center items-center rounded">
                        <div className="text-[15px] text-gray-200">
                          {riskRewardRatio ?? "..."}
                        </div>
                        <div className="text-[11px] text-gray-400 text-center mt-1 px-2">
                          {winRate ?? "Enter entry, target and stop-loss"}
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="col-span-2">
                      <div className="text-[13px] text-gray-400 mb-2">NOTE</div>
                      <textarea
                        name="note"
                        value={formData.note}
                        onChange={handleInputChange}
                        className="w-full h-[80px] bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none resize-none placeholder:text-gray-600"
                        placeholder="Add trade notes..."
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <div className="text-[13px] text-gray-400 mb-2">TAGS</div>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none placeholder:text-gray-600 mb-2"
                      placeholder="Add tags (press Enter to add)"
                    />
                    <div className="text-[11px] text-gray-500 mb-2">
                      Suggested: #breakout #pivot #earnings #trend
                    </div>
                    <div className="h-[60px] bg-[#25262C] px-3 py-2 rounded overflow-y-auto">
                      {formData.tags.map((tag, index) => (
                        <div 
                          key={index}
                          className="inline-flex items-center bg-[#2196F3]/10 text-[#2196F3] px-2 py-0.5 rounded-full text-[11px] mr-1.5 mb-1"
                        >
                          <span>{tag}</span>
                          <button 
                            className="ml-1.5 hover:text-white/90 transition-colors"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <RiCloseLine className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t border-gray-800 bg-[#1D1F29]">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSaving}
                    className={`flex items-center px-5 py-2 rounded text-[14px] font-medium transition-colors ${
                      isFormValid && !isSaving
                        ? 'bg-[#2196F3] text-white hover:bg-[#1E88E5]'
                        : 'bg-[#2196F3]/50 text-white/70 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                    </svg>
                    Save Setup
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
