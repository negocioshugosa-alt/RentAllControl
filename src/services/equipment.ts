import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Atualiza o status do equipamento no banco com base no total disponível e alugado.
 * Se o total de itens alugados por contratos ativos/pendentes for maior ou igual
 * à quantidade total do equipamento, define status como 'alugado'.
 * Caso contrário, define como 'disponivel'.
 * Status especiais como 'manutencao', 'inativo' ou 'vendido' não são sobrescritos.
 */
export async function updateEquipmentStatus(supabase: SupabaseClient, equipmentId: string) {
  const { data: equipment, error: eqError } = await supabase
    .from("equipment")
    .select("quantity, status")
    .eq("id", equipmentId)
    .single();

  if (eqError || !equipment) {
    console.error("Erro ao buscar equipamento para atualizar status:", eqError);
    return;
  }

  // Não altera status se estiver em manutenção, inativo ou vendido
  if (["manutencao", "inativo", "vendido"].includes(equipment.status)) {
    return;
  }

  // Busca todos os contratos ativos ou pendentes vinculados a este equipamento
  const { data: activeContracts, error: contractsError } = await supabase
    .from("contracts")
    .select("rented_quantity")
    .eq("equipment_id", equipmentId)
    .in("status", ["ativo", "pendente"]);

  if (contractsError) {
    console.error("Erro ao buscar contratos ativos do equipamento:", contractsError);
    return;
  }

  const totalRented = (activeContracts || []).reduce(
    (sum, c) => sum + (Number(c.rented_quantity) || 1),
    0
  );
  const totalQty = Number(equipment.quantity) || 1;

  const newStatus = totalRented >= totalQty ? "alugado" : "disponivel";

  if (equipment.status !== newStatus) {
    const { error: updateError } = await supabase
      .from("equipment")
      .update({ status: newStatus })
      .eq("id", equipmentId);
    if (updateError) {
      console.error("Erro ao atualizar status do equipamento:", updateError);
    }
  }
}
