"use client";

import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import {
  ShoppingCart,
  Boxes,
  ShieldCheck,
  Clock,
  User,
  Store,
  ChevronDown,
  Layers,
} from "lucide-react";

interface NavbarProps {
  currentRole: UserRole;
  currentCounter: string;
  userName: string;
  activeShiftNumber?: string;
  onSelectProfile: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentCounter,
  userName,
  activeShiftNumber,
  onSelectProfile,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 select-none shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Store Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-xl">
            UM
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-wide text-white">URBAN MART</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                Ghansoli
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">CRM & Supermarket Management POS</p>
          </div>
        </div>

        {/* Counter Profiles Navigation Tabs */}
        <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => onSelectProfile("CASHIER")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentRole === "CASHIER"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Counter 1: POS Billing</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectProfile("GRN_OPERATOR")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentRole === "GRN_OPERATOR"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Counter 2: GRN Inward</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectProfile("ADMIN")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentRole === "ADMIN"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin & Management</span>
          </button>
        </div>

        {/* Status Indicators & Profile Dropdown */}
        <div className="flex items-center space-x-4">
          {/* Active Shift badge */}
          {activeShiftNumber && (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{activeShiftNumber}</span>
            </div>
          )}

          {/* Clock */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-300 font-mono bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/40">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeStr}</span>
          </div>

          {/* User & Role Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-700/60 transition text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight">{userName}</div>
                <div className="text-[10px] text-emerald-400 font-mono leading-none">
                  {currentCounter || currentRole}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-700 text-xs">
                  <div className="font-semibold text-white">{userName}</div>
                  <div className="text-[11px] text-slate-400">Profile: {currentRole}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Counter: {currentCounter}</div>
                </div>

                <div className="pt-2 space-y-1 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Active Counter
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProfile("CASHIER");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-700 transition"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span>POS Billing (Counter 1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProfile("GRN_OPERATOR");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-700 transition"
                  >
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <span>GRN Stock Inward (Counter 2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProfile("ADMIN");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-700 transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Admin Console</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
