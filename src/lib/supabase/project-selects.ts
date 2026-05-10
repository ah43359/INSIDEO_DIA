/**
 * Shared Supabase `.select(...)` fragments so project queries stay consistent.
 *
 * Use the narrowest columns each surface needs; expand here when derive logic
 * requires more cliente fields.
 */

/** Full cliente row embedded for DIA chapter editors (cap derive prefill). */
export const PROJECT_SELECT_WITH_CLIENTE_FOR_DIA = `*,
         clientes ( id, razon_social, ruc, domicilio, representante, dni_representante, cargo, telefono, correo )`;
