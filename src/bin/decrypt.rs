use std::{env, fs};
use amtk::decrypt;

fn main() {
    let p = env::args().nth(1).expect("pass a path");
    let d = fs::read_to_string(p).expect("can't read");
    
    println!("{}", decrypt(&d).expect("decryption error"));
}
