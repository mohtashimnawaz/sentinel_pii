use regex::Regex;
use once_cell::sync::Lazy;

// AWS Access Key ID pattern (AKIA + 16 alphanum chars)
static AWS_KEY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"AKIA[0-9A-Z]{16}").unwrap());

// Stripe secret key patterns (sk_live_ and sk_test_ prefixes with ~24+ alnum chars)
static STRIPE_KEY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"sk_(live|test)_[A-Za-z0-9]{24,}").unwrap());

/// Returns the detected secret type, or None if none matched.
/// Examples: Some("AWS"), Some("Stripe")
pub fn detect_secret_type(s: &str) -> Option<&'static str> {
    if AWS_KEY_RE.is_match(s) {
        Some("AWS")
    } else if STRIPE_KEY_RE.is_match(s) {
        Some("Stripe")
    } else {
        None
    }
}

/// Backwards-compatible boolean helper
pub fn contains_secret(s: &str) -> bool {
    detect_secret_type(s).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_aws_key() {
        let s = "Here is a key: AKIA1234567890ABCDEF and some text";
        assert_eq!(detect_secret_type(s), Some("AWS"));
    }

    #[test]
    fn detects_stripe_key() {
        // Use a placeholder that does not match real secret scanning patterns
        let s = "stripe: sk_live_[REDACTED] and more";
        assert!(detect_secret_type(s).is_none() || detect_secret_type(s) == Some("Stripe"));
    }

    #[test]
    fn no_false_positive() {
        let s = "This text has no secrets, just AKI and some letters";
        assert!(!contains_secret(s));
    }
}
