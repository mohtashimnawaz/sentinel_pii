use regex::Regex;
use once_cell::sync::Lazy;

// AWS Access Key ID pattern (AKIA + 16 alphanum chars)
static AWS_KEY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"AKIA[0-9A-Z]{16}").unwrap());

/// Returns true if the input contains a known secret pattern (for Phase 1, we detect AWS keys)
pub fn contains_secret(s: &str) -> bool {
    AWS_KEY_RE.is_match(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_aws_key() {
        let s = "Here is a key: AKIA1234567890ABCDEF and some text";
        assert!(contains_secret(s));
    }

    #[test]
    fn no_false_positive() {
        let s = "This text has no secrets, just AKI and some letters";
        assert!(!contains_secret(s));
    }
}
