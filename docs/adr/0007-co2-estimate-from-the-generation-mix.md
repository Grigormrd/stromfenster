# 7. CO₂ estimate from the generation mix

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

"Clean" needs a number. SMARD has no CO₂ figures ([ADR 2](0002-smard-as-data-source.md)), but it reports how much each energy source generated in every quarter hour. Multiplied by an emission factor per source, that gives an estimate.

Two published sets of factors were read in their original documents:

|                             | Umweltbundesamt                                    | IPCC                                             |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Document                    | Climate Change 13/2025, Table 4                    | AR5, Working Group III, Annex III, Table A.III.2 |
| Counts                      | direct CO₂ from combustion, per kWh of electricity | lifecycle emissions in CO₂ equivalents           |
| Refers to                   | German power plants in 2024 (preliminary)          | technologies worldwide, medians, published 2014  |
| Lignite                     | 1,119 g/kWh                                        | 820 g/kWh, one value for all coal                |
| Hard coal                   | 860 g/kWh                                          | 820 g/kWh                                        |
| Natural gas                 | 392 g/kWh                                          | 490 g/kWh                                        |
| Wind, solar, hydro, biomass | zero by convention                                 | 11 to 48, biomass 230                            |

On a recorded day, 13 November 2026, both sets happen to give almost the same result for all of Germany: 258 g/kWh with the Umweltbundesamt values and 257 g CO₂-eq/kWh with the IPCC medians.

## Decision

Use the **direct emission factors of the Umweltbundesamt**.

- **They tell lignite and hard coal apart**, which SMARD reports separately and which differ by about 30 % in Germany.
- **They are current and made for Germany.** The same report gives the factor of the whole German mix (363 g CO₂/kWh for 2024, estimated), so a reader can put the estimate next to an official figure.

The estimate for a quarter hour is the emissions of all sources divided by all generation. A figure over several quarter hours divides the sum of emissions by the sum of generation, so an hour with much generation weighs more than one with little.

Three series need a choice the source does not make:

- **Other conventional** (mineral oil, waste, gases from coal and steel production, other fuels) has no factor in the source. The hard coal value stands in for it. This is not a small assumption: on the recorded day the group was 2.4 % of generation and accounted for about 20 of the 258 g/kWh.
- **Pumped storage** counts as zero. The electricity was generated, and counted, when the water was pumped up.
- **Biomass and other renewables** count as zero, as the source counts renewable fuels.

The factors, their basis and the source are data in `shared/utils/emissions.ts`. The methodology page builds its table from that file, so the page cannot say something else than the calculation does.

## Consequences

- **It is an estimate, and the pages say so** wherever the number appears, with a link to how it is made.
- **Direct emissions only.** No extraction and transport of fuel, no construction of plants, no greenhouse gases other than CO₂. Renewables therefore show as zero, which a lifecycle view would not.
- **Generation, not consumption.** Imports and exports are not part of it. The Umweltbundesamt relates its factors to electricity consumption; here they are applied to net generation as SMARD reports it.
- **Only for measured hours.** For the hours ahead there are forecasts for wind, solar and load, but not per conventional source, so the pages show the expected share of wind and solar instead.
- **The factors are annual averages** over all plants of a kind. A new edition of the report means new numbers in one file.
- **No licence statement was found in the publication.** Three numbers are taken from it and cited with title, series and table; no text or table is reproduced.
