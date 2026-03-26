'use client';

import { useState } from 'react';
import axios from 'axios';
import { Search, User } from 'lucide-react';

interface PersonaResult {
  id: string;
  nombres: string;
  apellidos: string;
  celular: string;
}

interface PersonaSearchInputProps {
  apiBase: string;
  onSelect: (persona: PersonaResult) => void;
}

export default function PersonaSearchInput({ apiBase, onSelect }: PersonaSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonaResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearched(false);
    try {
      // Try by celular/document first
      const res = await axios.get(`${apiBase}/personas/celular/${query}`);
      if (res.data) {
        setResults([res.data]);
      } else {
        setResults([]);
      }
    } catch {
      // If 404, try general search or show empty
      try {
        const res = await axios.get(`${apiBase}/personas`);
        const filtered = res.data.filter((p: PersonaResult) =>
          p.celular?.includes(query) ||
          p.nombres?.toLowerCase().includes(query.toLowerCase()) ||
          p.apellidos?.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered.slice(0, 5));
      } catch { setResults([]); }
    }
    finally { setSearching(false); setSearched(true); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Buscar por documento o celular..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white placeholder:text-slate-400"
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }} />
        </div>
        <button type="button" onClick={handleSearch} disabled={searching}
          className="px-3 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 shrink-0">
          {searching ? '...' : 'Buscar'}
        </button>
      </div>
      {searched && results.length === 0 && (
        <p className="text-xs text-slate-500 italic">No se encontraron personas con ese dato.</p>
      )}
      {results.length > 0 && (
        <div className="border border-slate-200 rounded-md divide-y divide-slate-100 overflow-hidden">
          {results.map(p => (
            <button key={p.id} type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm"
              onClick={() => onSelect(p)}>
              <User className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900">{p.nombres} {p.apellidos}</span>
              <span className="text-slate-500 ml-auto">{p.celular}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
