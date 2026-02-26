import React from 'react';
import { Panel } from '../Shared';

function DataEntrySection({
  newGame,
  setNewGame,
  handleGameSubmit,
  addTicket,
  addMerch,
  updateTicket,
  updateMerch,
  removeTicket,
  removeMerch,
}) {
  return (
    <Panel
      title="Data Entry Lab (Optional)"
      subtitle="Add a new game to the SQLite database to test how the analysis pipeline updates end-to-end."
    >
      <form onSubmit={handleGameSubmit} className="entry-form">
        <div className="form-grid">
          <label>Date<input type="date" required value={newGame.game_date} onChange={(e) => setNewGame({ ...newGame, game_date: e.target.value })} /></label>
          <label>Opponent<input type="text" required value={newGame.opponent} onChange={(e) => setNewGame({ ...newGame, opponent: e.target.value })} /></label>
          <label>Attendance<input type="number" required value={newGame.attendance} onChange={(e) => setNewGame({ ...newGame, attendance: e.target.value })} /></label>
          <label>Competition<input type="text" required value={newGame.competition} onChange={(e) => setNewGame({ ...newGame, competition: e.target.value })} /></label>
          <label>Venue<input type="text" required value={newGame.venue} onChange={(e) => setNewGame({ ...newGame, venue: e.target.value })} /></label>
          <label>Promotion<input type="text" value={newGame.promotion} onChange={(e) => setNewGame({ ...newGame, promotion: e.target.value })} /></label>
        </div>

        <div className="entry-grid">
          <div className="entry-card">
            <div className="entry-head">
              <h3>Ticket Lines</h3>
              <button type="button" className="ghost-btn" onClick={addTicket}>Add Ticket Type</button>
            </div>
            {newGame.tickets.map((t, idx) => (
              <div className="line-row" key={`ticket-${idx}`}>
                <input placeholder="Type" value={t.type} onChange={(e) => updateTicket(idx, 'type', e.target.value)} required />
                <input type="number" placeholder="Qty" value={t.quantity} onChange={(e) => updateTicket(idx, 'quantity', e.target.value)} required />
                <input type="number" placeholder="Revenue" value={t.revenue} onChange={(e) => updateTicket(idx, 'revenue', e.target.value)} required />
                <button type="button" className="ghost-btn" onClick={() => removeTicket(idx)}>Remove</button>
              </div>
            ))}
          </div>
          <div className="entry-card">
            <div className="entry-head">
              <h3>Merch Lines</h3>
              <button type="button" className="ghost-btn" onClick={addMerch}>Add Merch Line</button>
            </div>
            {newGame.merch.map((m, idx) => (
              <div className="line-row" key={`merch-${idx}`}>
                <input placeholder="Item" value={m.item} onChange={(e) => updateMerch(idx, 'item', e.target.value)} required />
                <input type="number" placeholder="Qty" value={m.quantity} onChange={(e) => updateMerch(idx, 'quantity', e.target.value)} required />
                <input type="number" placeholder="Total Revenue" value={m.total_revenue} onChange={(e) => updateMerch(idx, 'total_revenue', e.target.value)} required />
                <button type="button" className="ghost-btn" onClick={() => removeMerch(idx)}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="submit-row">
          <button type="submit" className="primary-btn">Submit New Game</button>
        </div>
      </form>
    </Panel>
  );
}

export default DataEntrySection;
