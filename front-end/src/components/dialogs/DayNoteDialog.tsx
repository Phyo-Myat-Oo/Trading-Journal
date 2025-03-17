import { useState } from 'react';

interface DayNoteDialogProps {
  onClose: () => void;
  onSave: (note: any) => void;
}

export const DayNoteDialog = ({ onClose, onSave }: DayNoteDialogProps) => {
  const [note, setNote] = useState({
    date: new Date().toISOString().slice(0, 10),
    mood: 'NEUTRAL',
    marketCondition: 'CHOPPY',
    marketVolatility: 'MEDIUM',
    summary: '',
    notes: ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-gray-200">New Day Note</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Mood</label>
              <div className="flex space-x-2">
                <button
                  className={`p-2 rounded ${
                    note.mood === 'GOOD' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, mood: 'GOOD' })}
                >
                  <span role="img" aria-label="happy">😊</span>
                </button>
                <button
                  className={`p-2 rounded ${
                    note.mood === 'NEUTRAL' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, mood: 'NEUTRAL' })}
                >
                  <span role="img" aria-label="neutral">😐</span>
                </button>
                <button
                  className={`p-2 rounded ${
                    note.mood === 'BAD' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, mood: 'BAD' })}
                >
                  <span role="img" aria-label="sad">😞</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Mkt Condition</label>
              <div className="flex space-x-2">
                <button
                  className={`p-2 rounded ${
                    note.marketCondition === 'TRENDING' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, marketCondition: 'TRENDING' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  className={`p-2 rounded ${
                    note.marketCondition === 'CHOPPY' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, marketCondition: 'CHOPPY' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </button>
                <button
                  className={`p-2 rounded ${
                    note.marketCondition === 'RANGING' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, marketCondition: 'RANGING' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Mkt Volatility</label>
              <div className="flex space-x-2">
                <button
                  className={`p-2 rounded ${
                    note.marketVolatility === 'LOW' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, marketVolatility: 'LOW' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10h16" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
                <button
                  className={`p-2 rounded ${
                    note.marketVolatility === 'MEDIUM' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, marketVolatility: 'MEDIUM' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11h4l3-6 4 12 3-6h4"/>
                  </svg>
                </button>
                <button
                  className={`p-2 rounded ${
                    note.marketVolatility === 'HIGH' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  onClick={() => setNote({ ...note, marketVolatility: 'HIGH' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10l4-8 4 16 4-16 4 8"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={note.date}
              onChange={(e) => setNote({ ...note, date: e.target.value })}
              className="bg-gray-700 text-gray-200 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Summary</label>
            <input
              type="text"
              value={note.summary}
              onChange={(e) => setNote({ ...note, summary: e.target.value })}
              className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="flex space-x-2 mb-2">
                <button className="p-1 hover:bg-gray-600 rounded">
                  <span className="font-bold">B</span>
                </button>
                <button className="p-1 hover:bg-gray-600 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 5h16M4 10h16M4 15h16"/>
                  </svg>
                </button>
                <button className="p-1 hover:bg-gray-600 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 5h16M4 10h10M4 15h16"/>
                  </svg>
                </button>
                <button className="p-1 hover:bg-gray-600 rounded">H₁</button>
                <button className="p-1 hover:bg-gray-600 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 4h14M3 8h14M3 12h14M3 16h14"/>
                  </svg>
                </button>
                <button className="p-1 hover:bg-gray-600 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 5h12M8 10h8M4 15h16"/>
                  </svg>
                </button>
                <button className="p-1 hover:bg-gray-600 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
                <button className="p-1 hover:bg-gray-600 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <textarea
                value={note.notes}
                onChange={(e) => setNote({ ...note, notes: e.target.value })}
                className="w-full h-32 bg-gray-700 text-gray-200 rounded resize-none focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onSave(note)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
