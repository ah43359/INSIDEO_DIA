// Capítulo 3 — Línea Base: docx body builder.

import type { Paragraph } from "docx";
import { bodyP, sectionHeading } from "@/lib/dia/framework/styles";
import type { ChapterState } from "@/lib/dia/framework/state";

export function buildLineaBase(state: ChapterState): Paragraph[] {
  const dF = state.dgFields;
  const out: Paragraph[] = [];

  out.push(sectionHeading(1, "3.0 Línea Base"));

  out.push(sectionHeading(2, "3.1 Alcance y metodología"));
  out.push(bodyP(`Temporada de levantamiento de campo: ${dF.lb_temporadaCampo || "[Completar]"}.`));
  out.push(bodyP(dF.lb_metodologiaGeneral?.trim() || "[Completar metodología general]"));
  if (dF.lb_fuentesSecundarias?.trim()) {
    out.push(bodyP(`Fuentes secundarias: ${dF.lb_fuentesSecundarias.trim()}.`));
  }

  out.push(sectionHeading(2, "3.2 Medio físico"));

  out.push(sectionHeading(3, "3.2.1 Meteorología, clima y zonas de vida"));
  out.push(bodyP(dF.lb_estacionesMeteo?.trim() || "[Completar estaciones meteorológicas]"));
  out.push(
    bodyP(
      `Zonas de vida: ${dF.lb_zonasVida || "[Completar]"}. ` +
        `Temperatura promedio anual: ${dF.lb_tempPromedioC || "[N°]"} °C. ` +
        `Precipitación promedio anual: ${dF.lb_precipMmAno || "[N°]"} mm. ` +
        `Humedad relativa: ${dF.lb_humedadPct || "[N°]"} %.`,
    ),
  );
  if (dF.lb_vientosResumen?.trim()) out.push(bodyP(`Vientos: ${dF.lb_vientosResumen.trim()}.`));

  out.push(sectionHeading(3, "3.2.2 Calidad del aire"));
  out.push(bodyP(`Protocolo aplicado: ${dF.lb_aireProtocolo || "[Completar]"}.`));
  out.push(bodyP(`Parámetros: ${dF.lb_aireParametros || "[Completar]"}.`));
  out.push(bodyP(dF.lb_aireResultados?.trim() || "[Completar resultados vs ECA]"));

  out.push(sectionHeading(3, "3.2.3 Calidad de ruido ambiental"));
  out.push(bodyP(`Protocolo aplicado: ${dF.lb_ruidoProtocolo || "[Completar]"}.`));
  out.push(bodyP(dF.lb_ruidoEstaciones?.trim() || "[Completar listado de estaciones]"));
  out.push(bodyP(dF.lb_ruidoResultados?.trim() || "[Completar resultados vs ECA]"));

  out.push(sectionHeading(3, "3.2.4 Geología"));
  out.push(bodyP(dF.lb_geologiaRegional?.trim() || "[Completar geología regional]"));
  out.push(bodyP(dF.lb_geologiaLocal?.trim() || "[Completar geología local]"));
  out.push(bodyP(`Potencial de DAR: ${dF.lb_potencialDAR || "[Completar]"}.`));

  out.push(sectionHeading(3, "3.2.5 Geomorfología"));
  out.push(bodyP(dF.lb_geoformas?.trim() || "[Completar geoformas]"));
  out.push(bodyP(`Pendientes predominantes: ${dF.lb_pendientes || "[Completar]"}.`));
  if (dF.lb_riesgosGeo?.trim()) out.push(bodyP(`Riesgos geológicos: ${dF.lb_riesgosGeo.trim()}.`));

  out.push(sectionHeading(3, "3.2.6 Hidrología"));
  out.push(
    bodyP(
      `Cuenca: ${dF.lb_cuenca || "[Completar]"}. ` +
        `Código Pfafstetter: ${dF.lb_pfafstetter || "[Completar]"}.`,
    ),
  );
  out.push(bodyP(dF.lb_redHidricaResumen?.trim() || "[Completar red hídrica y caudales]"));

  out.push(sectionHeading(3, "3.2.7 Hidrogeología"));
  out.push(bodyP(dF.lb_acuiferos?.trim() || "[Completar acuíferos]"));
  out.push(bodyP(`Nivel freático: ${dF.lb_nivelFreatico || "[Completar]"}.`));
  if (dF.lb_manantiales?.trim()) out.push(bodyP(dF.lb_manantiales.trim()));

  out.push(sectionHeading(3, "3.2.8 Suelos"));
  out.push(bodyP(dF.lb_clasificacionSuelos?.trim() || "[Completar clasificación de suelos]"));
  out.push(bodyP(`Capacidad de Uso Mayor: ${dF.lb_capacidadUso || "[Completar]"}.`));
  out.push(bodyP(dF.lb_calidadSuelos?.trim() || "[Completar calidad de suelos]"));

  out.push(sectionHeading(3, "3.2.9 Calidad del agua"));
  out.push(bodyP("Agua superficial:"));
  out.push(bodyP(`Parámetros: ${dF.lb_aguaSupParametros || "[Completar]"}.`));
  out.push(bodyP(dF.lb_aguaSupResultados?.trim() || "[Completar resultados]"));
  out.push(bodyP("Agua subterránea:"));
  out.push(bodyP(`Parámetros: ${dF.lb_aguaSubParametros || "[Completar]"}.`));
  out.push(bodyP(dF.lb_aguaSubResultados?.trim() || "[Completar resultados]"));

  out.push(sectionHeading(2, "3.3 Medio biológico"));

  out.push(sectionHeading(3, "3.3.1 Flora"));
  out.push(bodyP(dF.lb_formacionesVeg?.trim() || "[Completar formaciones vegetales]"));
  out.push(bodyP(dF.lb_especiesFlora?.trim() || "[Completar lista de especies de flora]"));
  out.push(bodyP(`Métodos: ${dF.lb_metodoFlora || "[Completar]"}.`));

  out.push(sectionHeading(3, "3.3.2 Fauna"));
  out.push(bodyP(dF.lb_aves?.trim() || "[Completar avifauna]"));
  out.push(bodyP(dF.lb_mamiferos?.trim() || "[Completar mastofauna]"));
  out.push(bodyP(dF.lb_reptilesAnfibios?.trim() || "[Completar herpetofauna]"));
  out.push(bodyP(`Métodos: ${dF.lb_metodoFauna || "[Completar]"}.`));

  out.push(sectionHeading(3, "3.3.3 Ecosistemas"));
  out.push(bodyP(dF.lb_ecosistemasIdentificados?.trim() || "[Completar ecosistemas identificados]"));
  if (dF.lb_ecosistemasFragiles?.trim())
    out.push(bodyP(`Ecosistemas frágiles: ${dF.lb_ecosistemasFragiles.trim()}.`));
  out.push(bodyP(`Relación con ANP: ${dF.lb_anpRelacion || "[Completar]"}.`));

  out.push(sectionHeading(2, "3.4 Medio socioeconómico-cultural"));

  out.push(sectionHeading(3, "3.4.1 Demografía"));
  out.push(bodyP(`Población del AID: ${dF.lb_poblacionAID || "[Completar]"}.`));
  out.push(bodyP(`Población del AII: ${dF.lb_poblacionAII || "[Completar]"}.`));
  if (dF.lb_centrosPoblados?.trim()) out.push(bodyP(dF.lb_centrosPoblados.trim()));

  out.push(sectionHeading(3, "3.4.2 Indicadores socioeconómicos"));
  out.push(bodyP(dF.lb_actividadesEconomicas?.trim() || "[Completar actividades económicas]"));
  out.push(bodyP(dF.lb_servicios?.trim() || "[Completar servicios básicos]"));
  out.push(bodyP(`IDH del distrito: ${dF.lb_idh || "[Completar]"}.`));

  out.push(sectionHeading(3, "3.4.3 Uso del territorio"));
  out.push(bodyP(dF.lb_usoActual?.trim() || "[Completar uso actual]"));
  out.push(bodyP(`Tenencia de la tierra: ${dF.lb_tenenciaTierra || "[Completar]"}.`));

  out.push(sectionHeading(2, "3.5 Arqueología y patrimonio cultural"));
  out.push(bodyP(`Estudio realizado: ${dF.lb_estudioArqueo || "[Completar]"}.`));
  if (dF.lb_ciras?.trim()) out.push(bodyP(`CIRAs: ${dF.lb_ciras.trim()}.`));
  if (dF.lb_anexoArqueo?.trim()) out.push(bodyP(`Ver ${dF.lb_anexoArqueo}.`));

  out.push(sectionHeading(2, "3.6 Cartografía"));
  out.push(bodyP(dF.lb_planosListado?.trim() || "[Completar listado de planos]"));
  if (dF.lb_anexoPlanos?.trim()) out.push(bodyP(`Ver ${dF.lb_anexoPlanos}.`));

  return out;
}
