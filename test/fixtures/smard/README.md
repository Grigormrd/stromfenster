# Recorded SMARD responses

Real responses from [SMARD](https://www.smard.de), stored byte for byte and used by the tests instead of the network.

Source and licence: Bundesnetzagentur | SMARD.de, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

| Directory       | Content                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `snapshot-a`    | All 17 series as an import would have requested them at the time of recording. The following week did not exist yet. |
| `snapshot-b`    | The same, recorded 23 minutes later: 21 values are new and 46 were corrected.                                        |
| `clock-changes` | Day-ahead prices for the weeks of 29 March 2026 (92 quarter hours) and 25 October 2026 (100), and the list of weeks. |

Each directory mirrors the paths on SMARD and has a `recording.json` with the time of recording and the requests made, including those that were answered with HTTP 404.

To record again:

```bash
node scripts/record-smard-fixtures.ts snapshot <name>
node scripts/record-smard-fixtures.ts weeks <name> <series id> <date> [<date> ...]
```
