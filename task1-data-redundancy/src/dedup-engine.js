/**
 * Task 1 — Deduplication Engine
 * Core logic for identifying and classifying redundant records
 */
/**
 * Pure JavaScript Dice coefficient string similarity algorithm
 */
function compareTwoStrings(first, second) {
  if (!first || !second) return 0;
  first = first.toString().replace(/\s+/g, '');
  second = second.toString().replace(/\s+/g, '');

  if (first === second) return 1;
  if (first.length < 2 || second.length < 2) return 0;

  const firstBigrams = new Map();
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substring(i, i + 2);
    const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;
    firstBigrams.set(bigram, count);
  }

  let intersectionSize = 0;
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substring(i, i + 2);
    const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;
    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / (first.length + second.length - 2);
}

const stringSimilarity = { compareTwoStrings };

const FUZZY_THRESHOLD = 0.85; // Similarity score above this = fuzzy match
const FALSE_POSITIVE_LOW = 0.60; // Below this = unique record
// Between FALSE_POSITIVE_LOW and FUZZY_THRESHOLD = potential false positive

/**
 * Normalize a string for comparison
 */
function normalize(str) {
  if (!str) return '';
  return str.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalize a phone number (strip non-digits)
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Validate incoming record data
 * Returns { valid: boolean, errors: string[] }
 */
function validateRecord(data) {
  const errors = [];

  if (!data.first_name || typeof data.first_name !== 'string' || data.first_name.trim().length === 0) {
    errors.push('first_name is required and must be a non-empty string');
  }
  if (!data.last_name || typeof data.last_name !== 'string' || data.last_name.trim().length === 0) {
    errors.push('last_name is required and must be a non-empty string');
  }
  if (!data.email || typeof data.email !== 'string') {
    errors.push('email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('email format is invalid');
    }
  }
  if (data.phone && typeof data.phone === 'string') {
    const digits = data.phone.replace(/\D/g, '');
    if (digits.length > 0 && (digits.length < 7 || digits.length > 15)) {
      errors.push('phone number must be between 7 and 15 digits');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check incoming record against existing database records
 * Returns classification result
 */
function checkRedundancy(db, data) {
  const normalizedEmail = normalize(data.email);
  const normalizedFirstName = normalize(data.first_name);
  const normalizedLastName = normalize(data.last_name);
  const normalizedPhone = normalizePhone(data.phone);

  // 1. Exact email match (exact duplicate)
  const emailMatch = db.prepare(
    'SELECT * FROM records WHERE LOWER(TRIM(email)) = ?'
  ).get(normalizedEmail);

  if (emailMatch) {
    return {
      type: 'exact_duplicate',
      matchedRecord: emailMatch,
      similarityScore: 1.0,
      details: `Exact email match found: ${emailMatch.email} (Record #${emailMatch.id})`
    };
  }

  // 2. Exact phone match with same name
  if (normalizedPhone) {
    const phoneMatches = db.prepare(
      "SELECT * FROM records WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', ''), ')', '') = ?"
    ).all(normalizedPhone);

    for (const match of phoneMatches) {
      const nameSim = stringSimilarity.compareTwoStrings(
        `${normalizedFirstName} ${normalizedLastName}`,
        `${normalize(match.first_name)} ${normalize(match.last_name)}`
      );
      if (nameSim >= FUZZY_THRESHOLD) {
        return {
          type: 'exact_duplicate',
          matchedRecord: match,
          similarityScore: nameSim,
          details: `Phone match with similar name (score: ${nameSim.toFixed(3)}) — Record #${match.id}`
        };
      }
    }
  }

  // 3. Fuzzy name + city matching
  const allRecords = db.prepare('SELECT * FROM records').all();
  let bestMatch = null;
  let bestScore = 0;

  for (const record of allRecords) {
    const nameSim = stringSimilarity.compareTwoStrings(
      `${normalizedFirstName} ${normalizedLastName}`,
      `${normalize(record.first_name)} ${normalize(record.last_name)}`
    );

    let citySim = 0;
    if (data.city && record.city) {
      citySim = stringSimilarity.compareTwoStrings(
        normalize(data.city),
        normalize(record.city)
      );
    }

    let addressSim = 0;
    if (data.address && record.address) {
      addressSim = stringSimilarity.compareTwoStrings(
        normalize(data.address),
        normalize(record.address)
      );
    }

    // Weighted composite score
    const composite = (nameSim * 0.5) + (citySim * 0.2) + (addressSim * 0.3);

    if (composite > bestScore) {
      bestScore = composite;
      bestMatch = record;
    }
  }

  if (bestMatch && bestScore >= FUZZY_THRESHOLD) {
    return {
      type: 'fuzzy_match',
      matchedRecord: bestMatch,
      similarityScore: bestScore,
      details: `Fuzzy match (composite score: ${bestScore.toFixed(3)}) — Record #${bestMatch.id}`
    };
  }

  if (bestMatch && bestScore >= FALSE_POSITIVE_LOW) {
    return {
      type: 'false_positive',
      matchedRecord: bestMatch,
      similarityScore: bestScore,
      details: `Potential false positive (composite score: ${bestScore.toFixed(3)}) — similar to Record #${bestMatch.id} but differences suggest distinct entry`
    };
  }

  return {
    type: 'unique',
    matchedRecord: null,
    similarityScore: bestScore,
    details: 'No significant match found — record is unique'
  };
}

/**
 * Insert a verified unique record into the database
 */
function insertRecord(db, data) {
  const stmt = db.prepare(`
    INSERT INTO records (first_name, last_name, email, phone, address, city)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.first_name.trim(),
    data.last_name.trim(),
    data.email.trim().toLowerCase(),
    data.phone ? data.phone.trim() : null,
    data.address ? data.address.trim() : null,
    data.city ? data.city.trim() : null
  );

  return result.lastInsertRowid;
}

/**
 * Log redundancy check result
 */
function logRedundancy(db, data, result, actionTaken) {
  const stmt = db.prepare(`
    INSERT INTO redundancy_log (incoming_data, matched_record_id, match_type, similarity_score, action_taken, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    JSON.stringify(data),
    result.matchedRecord ? result.matchedRecord.id : null,
    result.type,
    result.similarityScore,
    actionTaken,
    result.details
  );
}

/**
 * Process an incoming record: validate, check redundancy, insert or reject
 */
function processRecord(db, data) {
  // Step 1: Validate
  const validation = validateRecord(data);
  if (!validation.valid) {
    return {
      success: false,
      action: 'rejected',
      reason: 'validation_failed',
      errors: validation.errors
    };
  }

  // Step 2: Check redundancy
  const result = checkRedundancy(db, data);

  // Step 3: Act based on classification
  switch (result.type) {
    case 'exact_duplicate':
      logRedundancy(db, data, result, 'rejected');
      return {
        success: false,
        action: 'rejected',
        reason: 'exact_duplicate',
        classification: result.type,
        similarityScore: result.similarityScore,
        matchedRecordId: result.matchedRecord.id,
        details: result.details
      };

    case 'fuzzy_match':
      logRedundancy(db, data, result, 'rejected');
      return {
        success: false,
        action: 'rejected',
        reason: 'fuzzy_match',
        classification: result.type,
        similarityScore: result.similarityScore,
        matchedRecordId: result.matchedRecord.id,
        details: result.details
      };

    case 'false_positive':
      // Insert but flag for review
      try {
        const id = insertRecord(db, data);
        logRedundancy(db, data, result, 'inserted');
        return {
          success: true,
          action: 'inserted_with_flag',
          reason: 'false_positive',
          classification: result.type,
          recordId: id,
          similarityScore: result.similarityScore,
          details: result.details,
          warning: 'Record inserted but flagged — similar record exists. Review recommended.'
        };
      } catch (err) {
        if (err.message.includes('UNIQUE constraint')) {
          logRedundancy(db, data, result, 'rejected');
          return {
            success: false,
            action: 'rejected',
            reason: 'database_constraint',
            details: 'Email already exists (database constraint)'
          };
        }
        throw err;
      }

    case 'unique':
      try {
        const id = insertRecord(db, data);
        logRedundancy(db, data, result, 'inserted');
        return {
          success: true,
          action: 'inserted',
          classification: result.type,
          recordId: id,
          details: result.details
        };
      } catch (err) {
        if (err.message.includes('UNIQUE constraint')) {
          logRedundancy(db, data, result, 'rejected');
          return {
            success: false,
            action: 'rejected',
            reason: 'database_constraint',
            details: 'Email already exists (database constraint)'
          };
        }
        throw err;
      }

    default:
      return {
        success: false,
        action: 'error',
        reason: 'unknown_classification'
      };
  }
}

module.exports = {
  validateRecord,
  checkRedundancy,
  insertRecord,
  logRedundancy,
  processRecord,
  normalize,
  normalizePhone,
  FUZZY_THRESHOLD,
  FALSE_POSITIVE_LOW
};
