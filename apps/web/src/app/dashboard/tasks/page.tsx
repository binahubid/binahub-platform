'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui';

type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

export default function TasksPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/tasks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTasks(json.data || []);
      }
    } catch {
      toast('error', 'Gagal memuat tugas');
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiUrl, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`${apiUrl}/api/associate/tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks((prev) => [json.data, ...prev]);
        setNewTitle('');
      } else {
        toast('error', json.error || 'Gagal menambah tugas');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    } finally {
      setAdding(false);
    }
  }, [newTitle, adding, accessToken, apiUrl, toast]);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      const res = await fetch(`${apiUrl}/api/associate/tasks/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
      } else {
        toast('error', json.error || 'Gagal update tugas');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  }, [tasks, accessToken, apiUrl, toast]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/associate/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } else {
        toast('error', json.error || 'Gagal menghapus tugas');
      }
    } catch {
      toast('error', 'Gagal terhubung ke server');
    }
  }, [accessToken, apiUrl, toast]);

  const filtered = tasks.filter((t) =>
    filter === 'all' ? true : filter === 'pending' ? !t.completed : t.completed
  );

  const total = tasks.length;
  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-[#0B2C6B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola tugas harian Anda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{completedCount}</p>
        </div>
      </div>

      {/* Add Task */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTask();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Tambah tugas baru..."
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#0B2C6B] focus:ring-1 focus:ring-[#0B2C6B]/20"
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || adding}
          className="rounded-lg bg-[#0B2C6B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {adding ? 'Menambah...' : 'Tambah'}
        </button>
      </form>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-[#0B2C6B] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'Semua' : f === 'pending' ? 'Pending' : 'Selesai'}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="mt-4 text-sm font-medium text-slate-900">
            {filter === 'all' ? 'Belum ada tugas' : filter === 'pending' ? 'Tidak ada tugas pending' : 'Belum ada tugas selesai'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {filter === 'all' ? 'Tambah tugas baru di atas' : 'Ubah filter atau tambah tugas baru'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors ${
                task.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  task.completed
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 hover:border-[#0B2C6B]'
                }`}
              >
                {task.completed && (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm transition-colors ${
                  task.completed ? 'text-slate-400 line-through' : 'text-slate-900 font-medium'
                }`}
              >
                {task.title}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
