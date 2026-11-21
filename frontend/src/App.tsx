import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createRecord, deleteRecord, getRecords, type RecordItem } from './services/api';

function App() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRecords(await getRecords());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createRecord(title, details);
      setTitle('');
      setDetails('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your record.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteRecord(id);
      setRecords((current) => current.filter((record) => record.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the record.');
    }
  }

  return (
    <main className="shell">
      <header className="topbar"><span className="brand-mark">O</span><span>OBI · DevOps assignment</span><span className="tier-label">Three-tier demo</span></header>
      <section className="intro">
        <p className="eyebrow">A persistent workspace</p>
        <h1>Keep your ideas<br /><em>in the loop.</em></h1>
        <p className="lede">Create a note and watch it travel through the frontend, API, and PostgreSQL. Your records will still be here after a refresh.</p>
        <div className="flow"><span>Frontend</span><i /> <span>Backend API</span><i /> <span>PostgreSQL</span></div>
      </section>
      <section className="workspace">
        <form className="composer" onSubmit={submit}>
          <label htmlFor="record-title">Add a record</label>
          <input id="record-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="What would you like to remember?" required />
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={5000} placeholder="Add a few details (optional)" rows={3} />
          <div className="form-footer"><span>{title.length}/120</span><button disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Save record <'}</button></div>
        </form>
        <div className="list-head"><div><p className="eyebrow">Your collection</p><h2>Saved records <span>{records.length.toString().padStart(2, '0')}</span></h2></div><button className="refresh" onClick={() => { setLoading(true); void refresh(); }} aria-label="Refresh records">↻</button></div>
        {error && <p className="notice" role="alert">API unavailable: {error}. The frontend is still running; reconnect the database/API and refresh to load your records.</p>}
        {loading ? <p className="empty">Connecting to your workspace…</p> : records.length === 0 ? <p className="empty">No records yet. Add your first one above.</p> : (
          <ul className="records">{records.map((record) => <li className="record" key={record.id}>
            <div><h3>{record.title}</h3>{record.details && <p>{record.details}</p>}<time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString()}</time></div>
            <button className="delete" onClick={() => void remove(record.id)} aria-label={`Delete ${record.title}`}>Delete</button>
          </li>)}</ul>
        )}
      </section>
      <footer>Built with React · Express · PostgreSQL <span>Data persists in the database</span></footer>
    </main>
  );
}

export default App;
