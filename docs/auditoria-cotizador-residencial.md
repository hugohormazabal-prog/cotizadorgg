# Auditoría integral del cotizador residencial

Fecha: 31 de agosto de 2026.

## Alcance

- Fuente revisada en modo lectura: `/Users/hh/Downloads/Cotizador Residencial (2).xlsm`.
- Se inventariaron las 39 hojas y se trazaron las cadenas activas `MAIN → INPUT → COTBACK/CUBICADOR → COT_ONGRID/FINBACK → FC/CREDITOALZA`.
- El XLSM original y su VBA no fueron modificados.
- Tres revisiones independientes contrastaron fórmulas, motor web y cobertura del mantenedor.

## Caso patrón automatizado

El caso residencial monofásico, Región Metropolitana y cuenta de $120.000/mes se conserva como regresión de dimensionamiento. Desde el esquema 9, el inversor y los costos se calculan con las nuevas reglas comerciales solicitadas, por lo que ya no se comparan contra el precio histórico del Excel.

| Resultado | Excel de referencia | Motor web v9 |
|---|---:|---:|
| Paneles / potencia | 10 × 620 W / 6,2 kWp | 10 × 620 W / 6,2 kWp |
| Inversor | Huawei híbrido 6 kW | Huawei híbrido 5 kW por tramo 8–10 paneles |
| Generación anual | 8.878,4 kWh | 8.878 kWh mostrados |
| Autoconsumo / inyección | 2.880 / 5.998,4 kWh | 2.880 / 5.998 kWh mostrados |
| Ahorro año 1 | $1.474.520,30 | $1.474.520 |
| Precio, financiamiento y payback | Modelo anterior por kWp | Recalculados desde partidas fijas/variables y costos regionales |
| ALZA y proyección | Fórmulas auditadas | Sin cambios de fórmula |

La regresión se ejecuta con `npm run test:integrity`.

## Correcciones del motor

1. La selección residencial del inversor usa tramos configurables por cantidad de paneles: 1–7 → 3 kW, 8–10 → 5 kW, 11–12 → 6 kW y 13–20 → 8 kW. El panel 12 queda en el tramo de 6 kW para evitar el solapamiento de la conversación fuente.
2. Se eliminó la entrada de canalizaciones y el segundo factor que volvía a escalar estructura, cables y tableros. Los supuestos técnicos ya no modifican las partidas de costo.
3. Estructura, comunicación, cables/canalización, tableros/protecciones y puesta en marcha son materiales, cada uno con monto fijo por proyecto más monto variable por kWp.
4. Gestión del proyecto e Ingeniería TE4/conexión son costos fijos por región. Instalación es costo variable por kWp y región. Los valores iniciales provienen de la tabla regional de `SERVBACK`.
5. El precio de inyección se edita y consume como un único valor IVA incluido; no se vuelve a multiplicar por IVA.
6. Mercado Pago, Santander, ALZA y la proyección conservan las fórmulas auditadas anteriormente.
7. Las escrituras del mantenedor validan cobertura continua, ausencia de solapamientos y vínculo con inversores activos.

## Configuración expuesta

- Energía: tarifa, precio de inyección IVA incluido, autoconsumo y proyección de consumo.
- Dimensionamiento: catálogos, rangos de inversor por cantidad de paneles, mínimo y tope monofásico.
- Partidas y costos: cinco materiales con fijo + variable/kWp y tres servicios con valor regional.
- Supuestos técnicos: protección, mesas, fases y fijación, sin una segunda incidencia en costos.
- Financiamiento: Mercado Pago, Santander y todos los parámetros de ALZA.
- Proyección: IPC, degradación, horizonte, descuento, 25 valores MPC y dos reposiciones.
- Garantías e impacto: garantía por equipo, instalación y CO₂.
- Generación: 14 regiones × 12 meses.

Cada input principal muestra ahora su hoja/celda o declara que es una regla web. Los campos duplicados de garantía global se eliminaron del contrato; la fuente canónica es el equipo seleccionado.

## Regla comercial vigente

Cada partida de materiales se calcula como `fijo + variable × kWp`. Gestión e ingeniería toman una vez el valor fijo de la región, mientras instalación multiplica el valor regional por los kWp. No existe una segunda capa de canalizaciones que vuelva a alterar esos importes.

## Defectos heredados excluidos deliberadamente

- `FC Capital Propio!B45`, `FC MP!B45`, `FC SANTANDER!B45` y `FC ALZA!B48` contienen `#REF!`.
- La TIR de ALZA produce `#NUM!` porque el flujo no tiene cambio de signo.
- El “VAN 25 años” del libro apunta al acumulado del periodo 15 y no aplica VNA; el motor calcula los 25 años reales.
- `FINBACK!B58/B67` rotula cantidad de inversores, pero devuelve la tarifa de $250.
- El flujo residencial de Mercado Pago reutiliza la cuota Santander; se tomó la fórmula MP válida del flujo granel.
- Persisten nombres definidos y referencias externas rotas, además de un error en `COTBACKGRANEL!D332` y la validación `COT_GRANEL!L25`.
- Los `#VALUE!` de `IMAGEN` corresponden a imágenes en celda no interpretadas por el lector y no se incorporaron al motor.

Estos defectos permanecen documentados en la fuente, pero no se copiaron al producto web.
