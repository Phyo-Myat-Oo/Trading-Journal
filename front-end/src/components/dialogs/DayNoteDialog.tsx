import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { RiCloseLine } from 'react-icons/ri';
import { 
  MdTrendingUp,
  MdTrendingFlat,
  MdTrendingDown,
  MdSignalCellular1Bar,
  MdSignalCellular2Bar,
  MdSignalCellular4Bar,
  MdMood,
  MdSentimentNeutral,
  MdMoodBad
} from 'react-icons/md';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface DayNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: DayNoteData) => void;
}

interface DayNoteData {
  date: string;
  mood: 'GOOD' | 'NEUTRAL' | 'BAD';
  marketCondition: 'TRENDING' | 'CHOPPY' | 'RANGING';
  marketVolatility: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  notes: string;
}

export function DayNoteDialog({ isOpen, onClose, onSave }: DayNoteDialogProps) {
  const [formData, setFormData] = useState<DayNoteData>({
    date: new Date().toISOString().slice(0, 10),
    mood: 'NEUTRAL',
    marketCondition: 'CHOPPY',
    marketVolatility: 'MEDIUM',
    summary: '',
    notes: ''
  });

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
                    New Day Note
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
                  {/* Date and Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">DATE</div>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none focus:ring-1 focus:ring-[#2196F3] [color-scheme:dark]"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="text-[13px] text-gray-400 mb-2">SUMMARY</div>
                      <input
                        type="text"
                        value={formData.summary}
                        onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                        className="w-full bg-[#25262C] text-[13px] text-gray-200 py-1.5 px-3 rounded focus:outline-none placeholder:text-gray-600"
                        placeholder="Brief summary of the day..."
                      />
                    </div>
                  </div>

                  {/* Mood, Market Condition, Market Volatility */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Mood */}
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">MOOD</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, mood: 'GOOD' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.mood === 'GOOD'
                              ? 'bg-[#4CAF50] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdMood className="w-5 h-5 mx-auto" />
                        </button>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, mood: 'NEUTRAL' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.mood === 'NEUTRAL'
                              ? 'bg-[#2196F3] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdSentimentNeutral className="w-5 h-5 mx-auto" />
                        </button>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, mood: 'BAD' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.mood === 'BAD'
                              ? 'bg-[#EF5350] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdMoodBad className="w-5 h-5 mx-auto" />
                        </button>
                      </div>
                    </div>

                    {/* Market Condition */}
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">MKT CONDITION</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, marketCondition: 'TRENDING' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.marketCondition === 'TRENDING'
                              ? 'bg-[#2196F3] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdTrendingUp className="w-5 h-5 mx-auto" />
                        </button>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, marketCondition: 'CHOPPY' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.marketCondition === 'CHOPPY'
                              ? 'bg-[#2196F3] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdTrendingFlat className="w-5 h-5 mx-auto" />
                        </button>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, marketCondition: 'RANGING' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.marketCondition === 'RANGING'
                              ? 'bg-[#2196F3] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdTrendingDown className="w-5 h-5 mx-auto" />
                        </button>
                      </div>
                    </div>

                    {/* Market Volatility */}
                    <div>
                      <div className="text-[13px] text-gray-400 mb-2">MKT VOLATILITY</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, marketVolatility: 'LOW' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.marketVolatility === 'LOW'
                              ? 'bg-[#2196F3] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdSignalCellular1Bar className="w-5 h-5 mx-auto" />
                        </button>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, marketVolatility: 'MEDIUM' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.marketVolatility === 'MEDIUM'
                              ? 'bg-[#2196F3] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdSignalCellular2Bar className="w-5 h-5 mx-auto" />
                        </button>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, marketVolatility: 'HIGH' }))}
                          className={`flex-1 p-2 rounded ${
                            formData.marketVolatility === 'HIGH'
                              ? 'bg-[#2196F3] text-white'
                              : 'bg-[#25262C] text-gray-400'
                          }`}
                        >
                          <MdSignalCellular4Bar className="w-5 h-5 mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="text-[13px] text-gray-400 mb-2">NOTES</div>
                    <div className="bg-[#25262C] rounded-md overflow-hidden">
                      <ReactQuill
                        theme="snow"
                        value={formData.notes}
                        onChange={(content) => setFormData(prev => ({ ...prev, notes: content }))}
                        className="h-[200px] notes-editor"
                        modules={{
                          toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link', 'image']
                          ]
                        }}
                        formats={[
                          'bold', 'italic', 'underline',
                          'list', 'bullet',
                          'link', 'image'
                        ]}
                        placeholder="Detailed notes about market conditions, observations, lessons learned..."
                      />
                    </div>
                    <style dangerouslySetInnerHTML={{ __html: `
                      input[type="date"]::-webkit-calendar-picker-indicator {
                        filter: invert(0.8) brightness(1.5) saturate(1);
                        opacity: 0.8;
                        cursor: pointer;
                      }
                      input[type="date"]::-webkit-calendar-picker-indicator:hover {
                        opacity: 1;
                      }
                      .notes-editor {
                        background: #25262C;
                        border: none;
                        color: #E5E7EB;
                      }
                      .notes-editor .ql-toolbar {
                        background: #1D1F29;
                        border: none;
                        border-bottom: 1px solid #374151;
                      }
                      .notes-editor .ql-container {
                        border: none;
                        font-size: 14px;
                        color: #E5E7EB;
                      }
                      .notes-editor .ql-editor {
                        padding: 16px;
                        min-height: 120px;
                      }
                      .notes-editor .ql-editor.ql-blank::before {
                        color: #6B7280;
                        font-style: normal;
                        font-size: 14px;
                      }
                      .notes-editor .ql-stroke {
                        stroke: #9CA3AF;
                      }
                      .notes-editor .ql-fill {
                        fill: #9CA3AF;
                      }
                      .notes-editor .ql-picker {
                        color: #9CA3AF;
                      }
                      .notes-editor .ql-picker-options {
                        background: #25262C;
                        border: 1px solid #374151;
                      }
                      .notes-editor .ql-toolbar button {
                        padding: 4px 8px;
                        margin: 4px;
                        border-radius: 4px;
                      }
                      .notes-editor .ql-toolbar button:hover {
                        background: #374151;
                      }
                      .notes-editor .ql-toolbar button.ql-active {
                        background: #374151;
                      }
                      .notes-editor .ql-toolbar button.ql-active .ql-stroke {
                        stroke: #E5E7EB;
                      }
                      .notes-editor .ql-toolbar button.ql-active .ql-fill {
                        fill: #E5E7EB;
                      }
                      .notes-editor .ql-toolbar button:hover .ql-stroke {
                        stroke: #E5E7EB;
                      }
                      .notes-editor .ql-toolbar button:hover .ql-fill {
                        fill: #E5E7EB;
                      }
                    ` }} />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t border-gray-800 bg-[#1D1F29]">
                  <button
                    onClick={() => onSave(formData)}
                    className="bg-[#2196F3] text-white px-5 py-2 rounded text-[14px] font-medium hover:bg-[#1E88E5] transition-colors"
                  >
                    Save Note
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
