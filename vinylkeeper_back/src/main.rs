#[cfg(feature = "dev")]
fn load_env() {
    dotenvy::from_filename(".env.development").ok();
    println!("Environnement de développement chargé");
}

#[cfg(feature = "prod")]
fn load_env() {
    dotenvy::from_filename(".env.production").ok();
    println!("Environnement de production chargé");
}

fn main() {
    load_env();
}

