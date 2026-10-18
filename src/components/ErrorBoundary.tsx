"use client";

import { Component, type ReactNode } from "react";
import { isAuthError, errMsg } from "@/lib/errors";

type Props = { children: ReactNode; onAuthError: () => void };
type State = { error: unknown };

// useQuery melempar error saat render. Boundary ini menangani sesi berakhir
// (kembali ke login) dan error lain (tampilkan pesan + tombol coba lagi).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    if (isAuthError(error)) this.props.onAuthError();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (isAuthError(error)) {
      return <p className="p-8 text-center text-base-content/60">Sesi berakhir, mengalihkan ke login...</p>;
    }
    return (
      <div className="alert alert-error max-w-xl">
        <span>{errMsg(error)}</span>
        <button type="button" className="btn btn-sm" onClick={() => this.setState({ error: null })}>
          Coba lagi
        </button>
      </div>
    );
  }
}