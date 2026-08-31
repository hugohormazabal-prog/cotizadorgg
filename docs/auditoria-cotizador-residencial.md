# Auditoría integral del cotizador residencial

Fecha: 31 de agosto de 2026.

## Alcance

- Fuente revisada en modo lectura: `/Users/hh/Downloads/Cotizador Residencial (2).xlsm`.
- Se inventariaron las 39 hojas y se trazaron las cadenas activas `MAIN → INPUT → COTBACK/CUBICADOR → COT_ONGRID/FINBACK → FC/CREDITOALZA`.
- El XLSM original y su VBA no fueron modificados.
- Tres revisiones independientes contrastaron fórmulas, motor web y cobertura del mantenedor.

## Caso patrón automatizado

Caso residencial monofásico, Región Metropolitana y cuenta de $120.000/mes:

| Resultado | Excel | Motor web v7 |
|---|---:|---:|
| Paneles / potencia | 10 × 620 W / 6,2 kWp | 10 × 620 W / 6,2 kWp |
| Inversor | Huawei híbrido 6 kW | Huawei híbrido 6 kW |
| Generación anual | 8.878,4 kWh | 8.878 kWh mostrados |
| Autoconsumo / inyección | 2.880 / 5.998,4 kWh | 2.880 / 5.998 kWh mostrados |
| Ahorro año 1 | $1.474.520,30 | $1.474.520 |
| Precio proyecto | $5.179.000 | $5.179.000 |
| Payback simple | 3,5123 años | 3,5123 años |
| Mercado Pago | $5.893.000 / $491.083 × 12 | $5.893.000 / $491.083 × 12 |
| Santander | $127.645,83 × 48 | $127.646 × 48 |
| ALZA | $7.944.398,85 / $53.026,07 / 1,29823 UF | mismos valores antes del redondeo visible |
| Ahorro neto proyectado | $47.524.830 | $47.524.830 |
| VAN corregido a 25 años | $42.345.830 | $42.345.830 |

La regresión se ejecuta con `npm run test:integrity`.

## Correcciones del motor

1. La selección del inversor usa un SKU activo, con stock, línea On-Grid, fases compatibles y capacidad DC suficiente. Nombre, potencia y costo provienen siempre del mismo equipo.
2. Las partidas de estructura, canalización y protecciones se vinculan a sus coeficientes técnicos. Cambiar metros, mesas o amperes modifica cantidad, costo y precio; el caso base conserva el valor reconciliado.
3. Los costos por kWp se recalibraron desde los grupos activos de `CUBICADOR`, separando equipos físicos de estructura, comunicación, cables, tableros y servicios.
4. Mercado Pago usa sus comisiones de 6,99% y 3,19%, ambas con IVA; Santander mantiene 13% con IVA. Ambos totales se redondean hacia arriba a miles.
5. ALZA conserva la fórmula exacta de garantía, gastos, fee, gracia, PMT y conversión a UF.
6. La proyección usa degradación lineal, IPC, variación MPC anual, reposiciones en periodos 11 y 21, y descuento desde el periodo cero.
7. El PDF y el gráfico consumen la proyección real del motor; ya no multiplican ahorro año 1 por 25 ni vuelven a inventar marca/potencia de inversor.
8. Las escrituras del mantenedor se validan antes de normalizar, evitando reemplazar silenciosamente datos dañados por valores iniciales.

## Configuración expuesta

- Energía: tarifa, precio de nudo, IVA de inyección, autoconsumo y proyección de consumo.
- Dimensionamiento: catálogos de paneles e inversores, selección preferida, mínimo y tope monofásico.
- Variables por kWp: siete canalizaciones, protección, mesas, reglas de redondeo, fases y fijación.
- Precio: ocho partidas netas por kWp, margen efectivo, IVA y redondeo.
- Financiamiento: Mercado Pago, Santander y todos los parámetros de ALZA.
- Proyección: IPC, degradación, horizonte, descuento, 25 valores MPC y dos reposiciones.
- Garantías e impacto: garantía por equipo, instalación y CO₂.
- Generación: 14 regiones × 12 meses.

Cada input principal muestra ahora su hoja/celda o declara que es una regla web. Los campos duplicados de garantía global se eliminaron del contrato; la fuente canónica es el equipo seleccionado.

## Transformación solicitada a kWp

El Excel usa `MAIN!C44 = 2 × número de paneles` y mantiene `C45:C54` como entradas manuales de cada proyecto. Por requerimiento del cliente, el motor web transforma las magnitudes repetibles en coeficientes globales por kWp. Fases y fijación siguen siendo categorías técnicas.

La vinculación comercial se resuelve así:

- mesas/kWp escala la partida de estructura;
- suma de canalizaciones/kWp escala cables y canalización;
- amperes/kWp escala tableros y protecciones;
- fases intervienen en la selección del inversor compatible.

## Defectos heredados excluidos deliberadamente

- `FC Capital Propio!B45`, `FC MP!B45`, `FC SANTANDER!B45` y `FC ALZA!B48` contienen `#REF!`.
- La TIR de ALZA produce `#NUM!` porque el flujo no tiene cambio de signo.
- El “VAN 25 años” del libro apunta al acumulado del periodo 15 y no aplica VNA; el motor calcula los 25 años reales.
- `FINBACK!B58/B67` rotula cantidad de inversores, pero devuelve la tarifa de $250.
- El flujo residencial de Mercado Pago reutiliza la cuota Santander; se tomó la fórmula MP válida del flujo granel.
- Persisten nombres definidos y referencias externas rotas, además de un error en `COTBACKGRANEL!D332` y la validación `COT_GRANEL!L25`.
- Los `#VALUE!` de `IMAGEN` corresponden a imágenes en celda no interpretadas por el lector y no se incorporaron al motor.

Estos defectos permanecen documentados en la fuente, pero no se copiaron al producto web.
