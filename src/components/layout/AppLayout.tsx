import { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { Menu, X, Users, BarChart3, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
    { to: "/clients", label: "Clientes", icon: Users },
    { to: "/company", label: "Dashboard", icon: BarChart3 },
    { to: "/company/months", label: "Meses", icon: CalendarRange },
];

export default function AppLayout() {
    const [open, setOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Topbar */}
            <header className="sticky top-0 z-40 border-b border-border/60 bg-[hsl(var(--glass))] backdrop-blur-md">
                <div className="max-w-7xl mx-auto h-14 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            className="lg:hidden p-2 rounded-md hover:bg-card-hover transition"
                            onClick={() => setOpen((v) => !v)}
                            aria-label="Abrir menu"
                        >
                            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
                            <div className="w-6 h-6 rounded-md bg-[hsl(var(--primary))] shadow-[var(--shadow-glow)]" />
                            <span>Metric</span>
                        </Link>
                    </div>

                    {/* Nav desktop */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {links.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    cn(
                                        "px-3 py-2 rounded-md text-sm font-medium transition",
                                        "hover:bg-card-hover",
                                        isActive
                                            ? "bg-card-hover text-foreground"
                                            : "text-foreground-muted"
                                    )
                                }
                            >
                <span className="inline-flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                    {label}
                </span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Ações à direita (placeholder) */}
                    <div className="hidden lg:flex items-center gap-2">
                        {/* você pode por um switch de tema, user menu etc */}
                        {/*<Button variant="outline" size="sm" asChild>*/}
                        {/*    <a href="https://github.com/Guilherme-Assis/metric-zen-53" target="_blank" rel="noreferrer">*/}
                        {/*        GitHub*/}
                        {/*    </a>*/}
                        {/*</Button>*/}
                    </div>
                </div>

                {/* Nav mobile */}
                {open && (
                    <div className="lg:hidden border-t border-border/60 bg-[hsl(var(--glass))] backdrop-blur-md">
                        <div className="px-4 py-2 space-y-1">
                            {links.map(({ to, label, icon: Icon }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setOpen(false)}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition",
                                            "hover:bg-card-hover",
                                            isActive ? "bg-card-hover text-foreground" : "text-foreground-muted"
                                        )
                                    }
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* Conteúdo */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}