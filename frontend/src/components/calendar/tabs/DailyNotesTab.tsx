import { useState } from 'react';
import { RiAddLine, RiDeleteBin6Line } from 'react-icons/ri';
import { DayNoteDialog } from '../../dialogs/DayNoteDialog';

// Simple Daily Note interface
interface DailyNote {
  id: string;
  notes: string;
  marketCondition?: string;
  emotionalState?: string;
  createdAt: string;
}

export default function DailyNotesTab() {
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleDeleteEntry = (id: string) => {
    setDailyNotes(prev => prev.filter(entry => entry.id !== id));
  };
  
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveNote = (noteData: any) => {
    // Create a new daily note entry from the dialog data
    const newEntry: DailyNote = {
      id: `entry-${Date.now()}`,
      notes: noteData.notes,
      marketCondition: noteData.marketCondition,
      emotionalState: noteData.mood,
      createdAt: new Date().toISOString()
    };
    
    setDailyNotes(prev => [...prev, newEntry]);
    setIsDialogOpen(false);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-gray-300 font-medium">Daily Notes</h4>
        <button 
          onClick={handleOpenDialog}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
        >
          <RiAddLine size={16} />
          Add Note
        </button>
      </div>
      
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
      ) : (
        <div className="text-center py-8 bg-[#2C2E33] rounded-lg border border-[#3A3D45]">
          <div className="text-gray-400 mb-4">No daily notes for this date.</div>
        </div>
      )}
      
      {/* Day Note Dialog */}
      <DayNoteDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveNote}
      />
    </div>
  );
} 