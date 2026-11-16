<script setup lang="ts">
// The methodology in German. See ProseEn.vue for why the prose is a template
// per language. The two files have the same sections, in the same order.
const format = useFormatters();
const seriesCount = SERIES_IDS.length;
</script>

<template>
  <h1>So werden die Zahlen berechnet</h1>
  <p class="lead secondary">
    Was gemessen ist, was geschätzt ist, was fehlt und woher jede Zahl stammt.
  </p>

  <section id="data" aria-labelledby="data-heading">
    <h2 id="data-heading">Die Daten</h2>
    <p>
      Alle Daten stammen von <a href="https://www.smard.de">SMARD</a>, der Strommarktdaten-Plattform
      der Bundesnetzagentur, und werden unter
      <a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a> genutzt.
      Namensnennung: Bundesnetzagentur | SMARD.de.
    </p>
    <p>
      Stromfenster liest {{ seriesCount }} Datenreihen im Viertelstundenraster: den Day-Ahead-Preis,
      die Erzeugung je Energieträger, den Stromverbrauch sowie die Prognosen für Verbrauch, Wind und
      Photovoltaik. Ein geplanter Auftrag holt pro Minute eine Reihe, jede Reihe ist also alle
      {{ seriesCount }} Minuten an der Reihe. Werte, die SMARD nachträglich korrigiert, werden
      überschrieben.
    </p>
    <p>
      Beim Öffnen einer Seite wird nichts direkt von SMARD gelesen. Die Seiten zeigen, was die
      letzten Importe gespeichert haben; in der Fußzeile der Startseite steht, von wann der Stand
      ist.
    </p>
  </section>

  <section id="prices" aria-labelledby="prices-heading">
    <h2 id="prices-heading">Preise</h2>
    <p>
      Der Preis ist der Day-Ahead-Großhandelspreis für die Gebotszone Deutschland/Luxemburg. Er wird
      einmal am Tag in einer Auktion für jede Viertelstunde des Folgetages ermittelt; die Preise für
      morgen erscheinen am frühen Nachmittag. SMARD veröffentlicht ihn in €/MWh, die Seiten zeigen
      ct/kWh, also diesen Wert geteilt durch zehn.
    </p>
    <p>
      <strong>Das ist nicht der Preis, den ein Haushalt zahlt.</strong> Im Haushaltspreis stecken
      außerdem Steuern, Abgaben, Netzentgelte sowie Kosten und Marge des Lieferanten. Ein Vertrag
      mit festem Preis je kWh folgt dem Markt gar nicht. Nur mit einem dynamischen Tarif kommt der
      Großhandelspreis auf der Rechnung an, und dann zuzüglich der anderen Bestandteile. Was sich
      überträgt, ist der Verlauf der Kurve: Wenn sie niedrig ist, lässt sich Strom günstig erzeugen.
    </p>
    <p>Preise können negativ sein. Die Diagramme reichen dann unter null.</p>
  </section>

  <section id="window" aria-labelledby="window-heading">
    <h2 id="window-heading">Das beste Zeitfenster</h2>
    <p>
      Für eine Laufzeit von einer bis vier Stunden ist das günstigste Fenster die Folge
      aufeinanderfolgender Viertelstunden mit dem niedrigsten Durchschnittspreis. Das Fenster mit
      dem meisten Wind und der meisten Sonne ist das mit dem höchsten durchschnittlichen
      <a href="#wind-solar">erwarteten Anteil</a>.
    </p>
    <ul>
      <li>
        Berücksichtigt werden nur Fenster, die mit der nächsten Viertelstunde oder später beginnen.
      </li>
      <li>
        Ein Fenster braucht für jede seiner Viertelstunden einen Wert. Bevor die Preise für morgen
        veröffentlicht sind, liegt das günstigste Fenster deshalb im heutigen Tag.
      </li>
      <li>Sind zwei Fenster gleich gut, wird das frühere gezeigt.</li>
    </ul>
  </section>

  <section id="wind-solar" aria-labelledby="wind-solar-heading">
    <h2 id="wind-solar-heading">Erwarteter Anteil von Wind und Sonne</h2>
    <p>
      Für Stunden, die noch bevorstehen, gibt es Prognosen und keine Messwerte. Die
      Übertragungsnetzbetreiber prognostizieren die Erzeugung aus Wind und Photovoltaik und den
      Stromverbrauch für den Folgetag. Der gezeigte Anteil ist die prognostizierte Erzeugung aus
      Wind onshore, Wind offshore und Photovoltaik, geteilt durch den prognostizierten Verbrauch.
    </p>
    <p>
      Er kann über 100 % liegen, wenn mehr Wind- und Sonnenstrom erwartet wird, als Deutschland
      verbraucht. Die übrigen Energieträger werden nicht einzeln prognostiziert; ein vollständiger
      Erzeugungsmix oder ein CO₂-Wert für morgen lässt sich deshalb nicht angeben.
    </p>
  </section>

  <section id="generation" aria-labelledby="generation-heading">
    <h2 id="generation-heading">Erzeugung</h2>
    <p>
      Die Erzeugung ist die Nettostromerzeugung, wie SMARD sie ausweist: was Kraftwerke nach Abzug
      ihres Eigenbedarfs ins Netz der allgemeinen Versorgung einspeisen. Die Erzeugung in
      Industrienetzen und für das Netz der Deutschen Bahn gehört nicht dazu. Wo keine Messung
      vorliegt, sind einzelne Werte Hochrechnungen; sie treffen ein bis zwei Stunden nach der
      Viertelstunde ein, zu der sie gehören.
    </p>
    <p>
      SMARD liefert die Energie je Viertelstunde in MWh; das Diagramm zeigt die mittlere Leistung in
      GW. Die elf Reihen sind zu sechs Gruppen zusammengefasst:
    </p>
    <MethodologyGroupTable />
    <p>
      „Sonstige Erneuerbare“ sind bei SMARD Erdwärme sowie Deponie-, Klär- und Grubengas. „Sonstige
      Konventionelle“ sind Mineralöl, Abfall, Gase aus der Kohle- und Stahlerzeugung und weitere
      Brennstoffe. Pumpspeicher geben Strom ab, der früher erzeugt wurde; sie stehen bei den nicht
      erneuerbaren Gruppen, weil dieser Strom aus jeder Quelle stammen kann.
    </p>
  </section>

  <section id="co2" aria-labelledby="co2-heading">
    <h2 id="co2-heading">CO₂-Schätzung</h2>
    <p>
      Der CO₂-Wert ist eine Schätzung, keine Messung. Für jede Viertelstunde wird die Erzeugung
      jedes Energieträgers mit einem Emissionsfaktor multipliziert, die Ergebnisse werden addiert,
      und die Summe wird durch die gesamte Erzeugung geteilt. Der Wert für „heute bisher“ rechnet
      genauso über alle gemessenen Viertelstunden des Tages; eine Stunde mit viel Erzeugung zählt
      dadurch stärker.
    </p>
    <MethodologyFactorTable />
    <p>
      Die drei veröffentlichten Werte stammen vom {{ EMISSION_SOURCE.publisher }}:
      <a :href="EMISSION_SOURCE.url">{{ EMISSION_SOURCE.title }}</a>, {{ EMISSION_SOURCE.series }},
      Tabelle 4. Sie gelten für deutsche Kraftwerke im Jahr {{ EMISSION_SOURCE.year }} und sind dort
      als vorläufig gekennzeichnet.
    </p>
    <h3>Was die Schätzung nicht enthält</h3>
    <ul>
      <li>
        <strong>Alles vor und nach dem Kraftwerk.</strong> Die Faktoren erfassen nur die
        Verbrennung: nicht Förderung und Transport der Brennstoffe, nicht den Bau von Kraftwerken,
        Windrädern oder Solarmodulen und keine anderen Treibhausgase als CO₂. Deshalb stehen
        Erneuerbare bei null.
      </li>
      <li>
        <strong>Importe und Exporte.</strong> Die Schätzung beschreibt den in Deutschland erzeugten
        Strom, nicht den in Deutschland verbrauchten.
      </li>
      <li>
        <strong>Einen Wert für „Sonstige Konventionelle“.</strong> Die Quelle nennt keinen. An
        seiner Stelle steht der Wert für Steinkohle. Am 13. November 2026 machte diese Gruppe 2,4 %
        der Erzeugung aus und trug etwa 20 von 258 g/kWh bei.
      </li>
      <li>
        <strong>Unterschiede zwischen Kraftwerken und Stunden.</strong> Ein Faktor ist ein
        Durchschnitt über ein Jahr und über alle Kraftwerke einer Art.
      </li>
    </ul>
    <p>
      Zum Vergleich: Derselbe Bericht nennt für den gesamten deutschen Strommix
      {{ EMISSION_SOURCE.year }} geschätzt {{ format.grams(EMISSION_SOURCE.germanMix2024) }}. Er
      bezieht die Emissionen auf den Stromverbrauch, der Wert hier bezieht sie auf die
      Nettostromerzeugung. Die beiden Größen sind eng verwandt, aber nicht dieselbe.
    </p>
  </section>

  <section id="time" aria-labelledby="time-heading">
    <h2 id="time-heading">Zeit</h2>
    <p>
      Alle Zeiten sind deutsche Zeit. An den beiden Tagen im Jahr, an denen die Uhr umgestellt wird,
      hat ein Tag 92 oder 100 Viertelstunden statt 96; Diagramme und Tabellen richten sich danach.
    </p>
    <p>
      Die Startseite wird auf einem Server gerendert und bis zu fünf Minuten vorgehalten. Mit
      JavaScript verschiebt eine geöffnete Seite ihre „jetzt“-Marke und holt neuere Daten selbst
      nach. Ohne JavaScript zeigt sie den Stand ihres letzten Renderns.
    </p>
  </section>
</template>
