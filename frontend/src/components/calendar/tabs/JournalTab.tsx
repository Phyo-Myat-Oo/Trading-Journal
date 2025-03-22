import { useState } from 'react';
import { RiAddLine, RiDeleteBin6Line } from 'react-icons/ri';

// Simple Daily Note interface
interface DailyNote {
  id: string;
  notes: string;
  marketCondition?: string;
  emotionalState?: string;
  createdAt: string;
}

export default function DailyNotesTab() {
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [dailyNote, setDailyNote] = useState({
    notes: '',
    marketCondition: '',
    emotionalState: ''
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDailyNote(prev => ({
      ...prev,
      [name]: value
    }));
    setTouched(prev => new Set(prev).add(name));
  };
  
  const handleAddEntry = () => {
    setIsAddingEntry(true);
  };
  
  const handleCancelEntry = () => {
    setIsAddingEntry(false);
    setDailyNote({
      notes: '',
      marketCondition: '',
      emotionalState: ''
    });
    setTouched(new Set());
  };
  
  const handleSaveNote = async () => {
    if (!dailyNote.notes.trim()) return;
    
    try {
      setIsSaving(true);
      
      // Here you would save to your backend
      console.log("Saving daily note:", dailyNote);
      
      // Mock success (replace with real API call)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add entry to list
      const newEntry: DailyNote = {
        id: `entry-${Date.now()}`,
        notes: dailyNote.notes,
        marketCondition: dailyNote.marketCondition || undefined,
        emotionalState: dailyNote.emotionalState || undefined,
        createdAt: new Date().toISOString()
      };
      
      setDailyNotes(prev => [...prev, newEntry]);
      
      // Reset form after successful save
      setDailyNote({
        notes: '',
        marketCondition: '',
        emotionalState: ''
      });
      setTouched(new Set());
      setIsAddingEntry(false);
      
    } catch (error) {
      console.error("Error saving daily note:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteEntry = (id: string) => {
    setDailyNotes(prev => prev.filter(entry => entry.id !== id));
  };
  
  const isFieldTouched = (field: string) => touched.has(field);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-gray-300 font-medium">Daily Notes</h4>
        {!isAddingEntry && (
          <button 
            onClick={handleAddEntry}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
          >
            <RiAddLine size={16} />
            Add Note
          </button>
        )}
      </div>
      
      {isAddingEntry && (
        <div className="bg-[#2C2E33] rounded-lg p-3 sm:p-4 border border-[#3A3D45]">
          <div className="mb-3">
            <h4 className="text-gray-300 font-medium text-sm sm:text-base mb-2">Trading Notes</h4>
            <textarea 
              name="notes"
              value={dailyNote.notes}
              onChange={handleInputChange}
              className={`w-full bg-[#363940] border ${
                isFieldTouched('notes') && !dailyNote.notes.trim() 
                  ? 'border-red-400/50 focus:ring-red-400' 
                  : 'border-[#464A55] focus:ring-blue-500'
              } rounded-lg p-3 text-gray-200 text-sm resize-none focus:outline-none focus:ring-1`}
              placeholder="Record your thoughts, strategies, and lessons from today's trading session..."
              rows={6}
            ></textarea>
            {isFieldTouched('notes') && !dailyNote.notes.trim() && (
              <p className="mt-1 text-red-400 text-xs">Please enter your trading notes</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div>
              <label className="text-gray-400 text-xs sm:text-sm block mb-1">Market Conditions</label>
              <select 
                name="marketCondition"
                value={dailyNote.marketCondition}
                onChange={handleInputChange}
                className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select condition</option>
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
                <option value="sideways">Sideways</option>
                <option value="volatile">Volatile</option>
                <option value="choppy">Choppy</option>
                <option value="trending">Trending</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs sm:text-sm block mb-1">Emotional State</label>
              <select 
                name="emotionalState"
                value={dailyNote.emotionalState}
                onChange={handleInputChange}
                className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select state</option>
                <option value="calm">Calm</option>
                <option value="confident">Confident</option>
                <option value="anxious">Anxious</option>
                <option value="impulsive">Impulsive</option>
                <option value="frustrated">Frustrated</option>
                <option value="focused">Focused</option>
                <option value="distracted">Distracted</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button 
              onClick={handleCancelEntry}
              className="px-4 py-2 bg-[#363940] hover:bg-[#3A3D45] text-gray-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveNote}
              disabled={isSaving || !dailyNote.notes.trim()}
              className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                !dailyNote.notes.trim()
                  ? 'bg-gray-600/30 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      )}
      
      {dailyNotes.length > 0 ? (
        <div className="space-y-3">
          {dailyNotes.map((entry) => (
            <div 
              key={entry.id}
              className="bg-[#2C2E33] rounded-lg p-3 sm:p-4 border border-[#3A3D45]"
            >
              <div className="flex justify-between mb-2">
                <div className="flex gap-2">
                  {entry.marketCondition && (
                    <span className="bg-[#363940] text-gray-300 text-xs px-2 py-0.5 rounded">
                      {entry.marketCondition}
                    </span>
                  )}
                  {entry.emotionalState && (
                    <span className="bg-[#363940] text-gray-300 text-xs px-2 py-0.5 rounded">
                      {entry.emotionalState}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-gray-400 hover:text-red-400 p-1 transition-colors"
                  >
                    <RiDeleteBin6Line size={16} />
                  </button>
                </div>
              </div>
              <div className="text-gray-200 text-sm bg-[#25262B] p-3 rounded whitespace-pre-wrap">
                {entry.notes}
              </div>
            </div>
          ))}
        </div>
      ) : !isAddingEntry && (
        <div className="text-center py-8 bg-[#2C2E33] rounded-lg border border-[#3A3D45]">
          <div className="text-gray-400 mb-4">No daily notes for this date.</div>
          <button 
            onClick={handleAddEntry}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors inline-flex items-center gap-1.5"
          >
            <RiAddLine size={16} />
            Add Daily Note
          </button>
        </div>
      )}
    </div>
  );
} 