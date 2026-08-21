/* ==========================================================================
   Which Uma Are You? — Roster Manifest

   Tracks additional Uma Musume characters beyond the original six
   (which are the project's foundational cast, fully implemented since
   V0.1 and tracked directly in characters.js, not here). Each entry:

     { id, name, status }

   status is "implemented" (has a full entry in characters.js) or
   "planned" (named and slotted for a future batch, not yet built).

   ids here must never collide with each other or with an existing
   characters.js id — see js/roster.validate.mjs.

   Character names are original public knowledge of the franchise's
   well-known cast; no factual personality dossier was provided
   alongside the project's permission terms (see
   docs/fan-content-permissions.md), so implemented entries' content is
   original fan interpretation, same as the original six.
   ========================================================================== */

export const ROSTER = [
  /* --- Batch 1 (implemented) --- */
  { id: "mejiro-mcqueen", name: "Mejiro McQueen", status: "implemented" },
  { id: "symboli-rudolf", name: "Symboli Rudolf", status: "implemented" },
  { id: "air-groove", name: "Air Groove", status: "implemented" },
  { id: "vodka", name: "Vodka", status: "implemented" },
  { id: "daiwa-scarlet", name: "Daiwa Scarlet", status: "implemented" },
  { id: "grass-wonder", name: "Grass Wonder", status: "implemented" },
  { id: "mayano-top-gun", name: "Mayano Top Gun", status: "implemented" },
  { id: "rice-shower", name: "Rice Shower", status: "implemented" },
  { id: "agnes-tachyon", name: "Agnes Tachyon", status: "implemented" },
  { id: "oguri-cap", name: "Oguri Cap", status: "implemented" },

  /* --- Future batches (planned) --- */
  { id: "mihono-bourbon", name: "Mihono Bourbon", status: "planned" },
  { id: "nice-nature", name: "Nice Nature", status: "planned" },
  { id: "sakura-bakushin-o", name: "Sakura Bakushin O", status: "planned" },
  { id: "twin-turbo", name: "Twin Turbo", status: "planned" },
  { id: "winning-ticket", name: "Winning Ticket", status: "planned" },
  { id: "maruzensky", name: "Maruzensky", status: "planned" },
  { id: "taiki-shuttle", name: "Taiki Shuttle", status: "planned" },
  { id: "kitasan-black", name: "Kitasan Black", status: "planned" },
  { id: "satono-diamond", name: "Satono Diamond", status: "planned" },
  { id: "smart-falcon", name: "Smart Falcon", status: "planned" },
  { id: "super-creek", name: "Super Creek", status: "planned" },
  { id: "fuji-kiseki", name: "Fuji Kiseki", status: "planned" },
  { id: "king-halo", name: "King Halo", status: "planned" },
  { id: "tamamo-cross", name: "Tamamo Cross", status: "planned" },
  { id: "el-condor-pasa", name: "El Condor Pasa", status: "planned" },
  { id: "fine-motion", name: "Fine Motion", status: "planned" },
  { id: "seiun-sky", name: "Seiun Sky", status: "planned" },
  { id: "narita-brian", name: "Narita Brian", status: "planned" },
  { id: "biwa-hayahide", name: "Biwa Hayahide", status: "planned" },
  { id: "matikanefukukitaru", name: "Matikanefukukitaru", status: "planned" }
];
