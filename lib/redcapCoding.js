/**
 * REDCap value coding, shared by every path that writes to the study's
 * REDCap project: the in-person study export (this branch) and the API
 * submission functions (redcap branch). Keep one copy so both always
 * write the same codes.
 *
 * The app's answers are labels ('Yes', 'Very easy', ...); REDCap stores
 * the codes defined in the data dictionary.
 */

const YESNO_FIELDS = new Set([
  'kamath_numb', 'kamath_numb_wakeup', 'kamath_numb_firstwakeup',
  'kamath_numb_fingersmed', 'kamath_numb_quickmovements', 'kamath_numb_littlefinger', 'kamath_numb_activities', 'kamath_wristpain', 'kamath_dropobjects', 'kamath_neckpain', 'kamath_toesnumbortingle', 'kamath_splinttried', 'kamath_splinteffectiveness',
]);

const YESNO_CODES = { Yes: 1, No: 0 };

const EASE_CODES = { 'Very easy': 1, 'Somewhat easy': 2, 'Somewhat difficult': 3, 'Very difficult': 4 };

const KATZ_CLASS_CODES = {
  'Unlikely CTS': '0',
  'Possible CTS Symptom Distribution': '1',
  'Probable CTS Symptom Distribution': '2',
  'Classic CTS Symptom Distribution': '3',
};

const RADIO_CODES = {
  kamath_numb_pregnant : { Yes: 1, No: 2, "Not relevant": 3 },
  kamath_ease: EASE_CODES,
  katz_ease: EASE_CODES,
  katz_l_classification: KATZ_CLASS_CODES,
  katz_r_classification: KATZ_CLASS_CODES,
}

/** Map a field map of labels to REDCap codes. Blank values stay blank. */
export function toRedcapValues(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (value === '' || value === null || value === undefined) {
      out[key] = value;
    } else if (YESNO_FIELDS.has(key)) {
      out[key] = YESNO_CODES[value] ?? value;
    } else if (RADIO_CODES[key]) {
      out[key] = RADIO_CODES[key][value] ?? value;
    } else {
      out[key] = value;
    }
  }
  return out;
}
