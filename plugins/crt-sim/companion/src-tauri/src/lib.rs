use base64::Engine;
use serde::Serialize;
use serde_json::Value;
use std::{env, fs, path::PathBuf, sync::Mutex};

#[derive(Default)]
struct ExchangeState {
    input: Option<PathBuf>,
    output: Option<PathBuf>,
    preview: Option<PathBuf>,
}

#[derive(Serialize)]
struct ExchangeContext {
    active: bool,
    preset: String,
    preview_data_url: String,
}

fn exchange_args() -> Result<ExchangeState, String> {
    let args: Vec<String> = env::args().collect();
    let argument = |name: &str| {
        args.iter()
            .position(|value| value == name)
            .and_then(|index| args.get(index + 1))
            .map(PathBuf::from)
    };
    let input = argument("--ofx-exchange");
    let output = argument("--ofx-result");
    let preview = argument("--ofx-preview");
    if input.is_none() && output.is_none() {
        return Ok(ExchangeState::default());
    }
    let input = input
        .ok_or("--ofx-exchange requires a path")?
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let output = output.ok_or("--ofx-result requires a path")?;
    let parent = output
        .parent()
        .ok_or("result path has no parent")?
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if input.parent() != Some(parent.as_path()) {
        return Err("exchange files must share one directory".into());
    }
    let preview = preview
        .map(|path| path.canonicalize().map_err(|error| error.to_string()))
        .transpose()?;
    if preview
        .as_ref()
        .is_some_and(|path| path.parent() != Some(parent.as_path()))
    {
        return Err("preview must share the exchange directory".into());
    }
    Ok(ExchangeState {
        input: Some(input),
        output: Some(output),
        preview,
    })
}


fn validate_preset(text: &str) -> Result<Value, String> {
    if text.len() > 128 * 1024 { return Err("preset exceeds 128 KB".into()); }
    let value: Value = serde_json::from_str(text).map_err(|e| e.to_string())?;
    if value.get("version").and_then(Value::as_u64) != Some(1) { return Err("incompatible CRT preset".into()); }
    let mask = value.get("maskType").and_then(Value::as_u64).ok_or("invalid mask type")?;
    if mask >= 12 { return Err("invalid mask type".into()); }
    let params = value.get("params").and_then(Value::as_object).ok_or("missing parameters")?;
    let contract: Value = serde_json::from_str(include_str!("../../../contracts/parameters-v1.json")).map_err(|e|e.to_string())?;
    for def in contract["parameters"].as_array().ok_or("invalid contract")? {
        let id=def["id"].as_str().ok_or("invalid parameter ID")?;
        let n=params.get(id).and_then(Value::as_f64).ok_or_else(||format!("missing parameter: {id}"))?;
        if !n.is_finite() || n < def["min"].as_f64().unwrap() || n > def["max"].as_f64().unwrap()
            || (def["type"] != "double" && n.fract() != 0.0) { return Err(format!("invalid parameter: {id}")); }
    }
    Ok(value)
}

#[tauri::command]
fn host_exchange_context(
    state: tauri::State<'_, Mutex<ExchangeState>>,
) -> Result<ExchangeContext, String> {
    let state = state.lock().map_err(|_| "exchange lock poisoned")?;
    let Some(input) = state.input.as_ref() else {
        return Ok(ExchangeContext {
            active: false,
            preset: String::new(),
            preview_data_url: String::new(),
        });
    };
    let preset = fs::read_to_string(input).map_err(|error| error.to_string())?;
    validate_preset(&preset)?;
    let preview_data_url = if let Some(path) = state.preview.as_ref() {
        let bytes = fs::read(path).map_err(|error| error.to_string())?;
        if bytes.len() > 4 * 1024 * 1024 {
            return Err("OFX preview exceeds 4 MB".into());
        }
        format!(
            "data:image/bmp;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(bytes)
        )
    } else {
        String::new()
    };
    Ok(ExchangeContext {
        active: true,
        preset,
        preview_data_url,
    })
}

#[tauri::command]
fn host_exchange_apply(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<ExchangeState>>,
    preset: String,
) -> Result<(), String> {
    let normalized = serde_json::to_string_pretty(&validate_preset(&preset)?)
        .map_err(|error| error.to_string())?
        + "\n";
    let state = state.lock().map_err(|_| "exchange lock poisoned")?;
    let output = state.output.as_ref().ok_or("no OFX edit session")?;
    let temporary = output.with_extension("tmp");
    fs::write(&temporary, normalized).map_err(|error| error.to_string())?;
    fs::rename(&temporary, output).map_err(|error| error.to_string())?;
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn host_exchange_cancel(app: tauri::AppHandle) {
    app.exit(2);
}

pub fn run() {
    let exchange = exchange_args().expect("Invalid CRT OFX exchange arguments");
    tauri::Builder::default()
        .manage(Mutex::new(exchange))
        .invoke_handler(tauri::generate_handler![
            host_exchange_context,
            host_exchange_apply,
            host_exchange_cancel
        ])
        .run(tauri::generate_context!())
        .expect("CRT SIM Companion failed");
}


#[cfg(test)]
mod tests {
    use super::validate_preset;
    fn preset() -> serde_json::Value {
        let all: serde_json::Value=serde_json::from_str(include_str!("../../../presets/crt-presets.json")).unwrap();
        serde_json::json!({"version":1,"maskType":all[0]["maskType"],"params":all[0]["params"]})
    }
    #[test] fn accepts_complete_preset() { assert!(validate_preset(&preset().to_string()).is_ok()); }
    #[test] fn rejects_incomplete_and_invalid_values() {
        let mut p=preset();p["params"].as_object_mut().unwrap().remove("scan");assert!(validate_preset(&p.to_string()).is_err());
        let mut p=preset();p["maskType"]=12.into();assert!(validate_preset(&p.to_string()).is_err());
        let mut p=preset();p["params"]["noiseSeed"]=0.5.into();assert!(validate_preset(&p.to_string()).is_err());
        let mut p=preset();p["params"]["scan"]=5.into();assert!(validate_preset(&p.to_string()).is_err());
        let mut p=preset();p["version"]=16.into();assert!(validate_preset(&p.to_string()).is_err());
    }
}
