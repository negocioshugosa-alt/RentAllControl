"use client";
// src/components/dashboard/EquipmentStatus.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  metrics: {
    rented: number;
    available: number;
    maintenance: number;
    totalEquipment: number;
  };
}

export function EquipmentStatus({ metrics }: Props) {
  const data = [
    { name: "Alugado", value: metrics.rented, color: "#3b82f6" },
    { name: "Disponível", value: metrics.available, color: "#22c55e" },
    { name: "Manutenção", value: metrics.maintenance, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const inactive = metrics.totalEquipment - metrics.rented - metrics.available - metrics.maintenance;
  if (inactive > 0) data.push({ name: "Inativo", value: inactive, color: "#94a3b8" });

  return (
    <div className="rounded-xl border bg-card p-5 h-full">
      <h3 className="font-semibold mb-1">Status dos Equipamentos</h3>
      <p className="text-sm text-muted-foreground mb-4">Visão geral da frota</p>

      {metrics.totalEquipment === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Nenhum equipamento cadastrado
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} equipamentos`]}
                contentStyle={{
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.value}</span>
                  <span className="text-muted-foreground text-xs">
                    ({((item.value / metrics.totalEquipment) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
