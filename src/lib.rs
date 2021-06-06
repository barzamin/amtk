use aes::Aes128;
use block_modes::block_padding::Pkcs7;
use block_modes::{BlockMode, Cbc};
use pbkdf2::pbkdf2;
use hmac::Hmac;
use sha1::Sha1;
use std::str;

type Aes128CbcPadded = Cbc<Aes128, Pkcs7>;

const AES_IV: &[u8] = &[
    0xc6, 0xeb, 0x2f, 0x7f, 0x5c, 0x47, 0x40, 0xc1, 0xa2, 0xf7, 0x8, 0xfe, 0xfd, 0x94, 0x7d, 0x39,
]; // c6eb2f7f5c4740c1a2f708fefd947d39
const PBKDF2_SALT: &[u8] = &[0x9a, 0x36, 0x86, 0xac]; // 9a3686ac
const PK: &[u8] = b"69af143c-e8cf-47f8-bf09-fc1f61e5cc33";

fn kdf(pw: &[u8]) -> Vec<u8> {
    let mut deriv_key = vec![0u8; 16];

    pbkdf2::<Hmac<Sha1>>(pw, PBKDF2_SALT, 1000, &mut deriv_key);

    return deriv_key;
}

// TODO: remove expects
fn decrypt_internal(ciphertext: &[u8], pw: &[u8]) -> Vec<u8> {
    let dk = kdf(pw);

    let cipher = Aes128CbcPadded::new_from_slices(&dk, AES_IV).expect("invalid IV length");
    cipher.decrypt_vec(ciphertext).expect("block mode error")
}

// TODO: remove unwraps
pub fn decrypt(data: &str) -> String {
    let (ciphertext, encrypted_pw) = data.split_at(data.len() - 88);
    let pw_plaintext =
        String::from_utf8(decrypt_internal(&base64::decode(encrypted_pw).unwrap(), PK)).unwrap();
    let pw = pw_plaintext.split("|").next().unwrap();

    let plaintext = String::from_utf8(decrypt_internal(
        &base64::decode(ciphertext).unwrap(),
        pw.as_bytes(),
    ))
    .unwrap();

    plaintext
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kdf() {
        assert_eq!(
            kdf(PK),
            [
                0x7, 0x1e, 0x28, 0x3e, 0x78, 0x2b, 0x88, 0x27, 0x39, 0x6d, 0x64, 0x86, 0xdf, 0xb8,
                0x70, 0x27
            ]
        );
    }

    #[test]
    fn test_internal_decrypt_phase1() {
        let ciphertext = base64::decode("CXgnq/gU8YfogvSlywDWApL5s0sE6SKd9M4Ky0zuH2F+BWkSTSXSMNFyEAIb3MpKwOgIZX3uGuNIUzUpevqlWQ==").unwrap();
        assert_eq!(
            str::from_utf8(&decrypt_internal(&ciphertext, PK)).unwrap(),
            "7bb0fd35-d2a0-4ca5-9e1d-f6f1a1a8eed7|2021-06-05T07:12:21.000Z"
        );
    }
}
