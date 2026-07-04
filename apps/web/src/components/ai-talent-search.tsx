'use client';

import { useState } from 'react';
import { Avatar } from './ui';

type MatchedAssociate = {
  id: string;
  name: string;
  headline: string;
  location?: string;
  matchScore: number;
  skills: string[];
  photo_url?: string;
};

export function AITalentSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchedAssociate[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    
    // TODO: Replace with actual API call to AI search endpoint
    // For now, show empty results
    setTimeout(() => {
      setResults([]);
      setLoading(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">AI Talent Search</h2>
      <p className="mt-1 text-sm text-slate-500">Find the right talent using AI.</p>

      {/* Search Input */}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the talent you're looking for..."
            rows={2}
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-[#0B2C6B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2C6B]"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B2C6B] text-white transition-colors hover:bg-[#0A255A] disabled:opacity-50"
        >
          {loading ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-medium text-slate-500">Matched Associates</p>
          <div className="space-y-3">
            {results.map((associate) => (
              <div
                key={associate.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={associate.name} src={associate.photo_url} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{associate.name}</p>
                    <p className="text-xs text-slate-500">{associate.headline}</p>
                    {associate.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {associate.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-600">{associate.matchScore}%</p>
                    <p className="text-xs text-slate-400">Match</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {searched && !loading && results.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center py-8 rounded-lg bg-slate-50">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">No results found. Try a different search.</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-6 flex flex-col items-center justify-center py-8">
          <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">Searching for talent...</p>
        </div>
      )}
    </div>
  );
}
