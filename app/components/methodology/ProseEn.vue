<script setup lang="ts">
// The methodology in English. Long prose is kept as a template per language
// instead of in the message files, where paragraphs with links and emphasis
// are hard to read and to translate. The tables are shared.
const format = useFormatters();
const seriesCount = SERIES_IDS.length;
</script>

<template>
  <section id="data" aria-labelledby="data-heading">
    <h2 id="data-heading">The data</h2>
    <p>
      All data comes from <a href="https://www.smard.de">SMARD</a>, the electricity market data
      platform of the Bundesnetzagentur, and is used under
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Attribution:
      Bundesnetzagentur | SMARD.de.
    </p>
    <p>
      Stromfenster reads {{ seriesCount }} series in 15-minute resolution: the day-ahead price,
      generation per energy source, load, and the forecasts for load, wind and solar. A scheduled
      job fetches one series per minute, so each series is looked at again every
      {{ seriesCount }} minutes. Values that SMARD corrects afterwards are overwritten.
    </p>
    <p>
      Nothing on the pages is read from SMARD at the moment you open them. They show what the last
      imports stored, and the footer of the start page says from when that is.
    </p>
  </section>

  <section id="prices" aria-labelledby="prices-heading">
    <h2 id="prices-heading">Prices</h2>
    <p>
      The price is the day-ahead wholesale price for the bidding zone Germany/Luxembourg. It is set
      once a day in an auction for every quarter hour of the following day, and tomorrow's prices
      appear in the early afternoon. SMARD publishes it in EUR/MWh; the pages show ct/kWh, which is
      that number divided by ten.
    </p>
    <p>
      <strong>It is not what a household pays.</strong> A household price also contains taxes,
      levies, grid fees and the supplier's costs and margin. A contract with a fixed price per kWh
      does not follow the market at all. Only with a dynamic tariff does the wholesale price reach
      the bill, and then with those other parts on top. The shape of the curve is what carries over:
      when it is low, electricity is cheap to generate.
    </p>
    <p>Prices can be negative. The charts then extend below zero.</p>
  </section>

  <section id="window" aria-labelledby="window-heading">
    <h2 id="window-heading">The best window</h2>
    <p>
      For a duration of one to four hours, the cheapest window is the stretch of consecutive quarter
      hours with the lowest average price. The window with the most wind and solar is the one with
      the highest average
      <a href="#wind-solar">expected share</a>.
    </p>
    <ul>
      <li>Only windows that start with the next quarter hour or later are considered.</li>
      <li>
        A window needs a value for every one of its quarter hours. Before tomorrow's prices are
        published, the cheapest window therefore lies within today.
      </li>
      <li>If two windows are equally good, the earlier one is shown.</li>
    </ul>
  </section>

  <section id="wind-solar" aria-labelledby="wind-solar-heading">
    <h2 id="wind-solar-heading">Expected share of wind and solar</h2>
    <p>
      For hours that lie ahead there are forecasts, not measurements. The transmission system
      operators forecast wind and solar generation and the load for the following day. The share
      shown is the forecast generation from wind onshore, wind offshore and solar, divided by the
      forecast load.
    </p>
    <p>
      It can exceed 100 % when more wind and solar power is expected than Germany uses. The other
      sources are not forecast one by one, so a full generation mix or a CO₂ figure for tomorrow
      cannot be given.
    </p>
  </section>

  <section id="generation" aria-labelledby="generation-heading">
    <h2 id="generation-heading">Generation</h2>
    <p>
      Generation is net generation as SMARD reports it: what plants feed into the public grid, after
      their own consumption. Generation inside industrial networks and for the railway grid is not
      part of it. Some values are projections where no measurement exists, and they arrive one to
      two hours after the quarter hour they belong to.
    </p>
    <p>
      SMARD delivers energy per quarter hour in MWh; the chart shows the average power in GW. The
      eleven series are folded into six groups:
    </p>
    <MethodologyGroupTable />
    <p>
      "Other renewables" on SMARD are geothermal energy and landfill, sewage and mine gas. "Other
      conventional" are mineral oil, waste, gases from coal and steel production, and other fuels.
      Pumped storage releases electricity that was generated earlier; it is listed with the
      non-renewable groups because that electricity can come from any source.
    </p>
  </section>

  <section id="co2" aria-labelledby="co2-heading">
    <h2 id="co2-heading">CO₂ estimate</h2>
    <p>
      The CO₂ figure is an estimate, not a measurement. For each quarter hour, the generation of
      every source is multiplied by an emission factor, the results are added up, and the sum is
      divided by the total generation. The figure for "today so far" does the same over all measured
      quarter hours of the day, so an hour with much generation weighs more.
    </p>
    <MethodologyFactorTable />
    <p>
      The three published values are from the {{ EMISSION_SOURCE.publisher }}:
      <a :href="EMISSION_SOURCE.url" lang="de">{{ EMISSION_SOURCE.title }}</a>,
      {{ EMISSION_SOURCE.series }}, {{ EMISSION_SOURCE.table }}. They are for German power plants in
      {{ EMISSION_SOURCE.year }} and are marked as preliminary there.
    </p>
    <h3>What the estimate leaves out</h3>
    <ul>
      <li>
        <strong>Everything before and after the power plant.</strong> The factors cover the
        combustion only: not the extraction and transport of fuel, not the construction of plants,
        wind turbines or solar panels, and no greenhouse gases other than CO₂. That is why
        renewables count as zero.
      </li>
      <li>
        <strong>Imports and exports.</strong> The estimate describes electricity generated in
        Germany, not electricity used in Germany.
      </li>
      <li>
        <strong>A value for "other conventional".</strong> The source has none. The hard coal value
        is used in its place. On 13 November 2026 this group was 2.4 % of generation and accounted
        for about 20 of 258 g/kWh.
      </li>
      <li>
        <strong>Differences between plants and hours.</strong> A factor is an average over a year
        and over all plants of a kind.
      </li>
    </ul>
    <p>
      For comparison, the same report gives {{ format.grams(EMISSION_SOURCE.germanMix2024) }} for
      the whole German electricity mix in {{ EMISSION_SOURCE.year }}, as an estimate. It relates
      emissions to electricity consumption, while the figure here relates them to net generation, so
      the two are close relatives, not the same quantity.
    </p>
  </section>

  <section id="time" aria-labelledby="time-heading">
    <h2 id="time-heading">Time</h2>
    <p>
      All times are German time. On the two days of the year when the clocks change, a day has 92 or
      100 quarter hours instead of 96; the charts and tables follow that.
    </p>
    <p>
      The start page is rendered on a server and kept for up to five minutes. With JavaScript, an
      open page moves its "now" marker and fetches newer data by itself. Without JavaScript it shows
      the state of its last rendering.
    </p>
  </section>
</template>
