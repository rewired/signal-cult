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
    if text.len() > 128 * 1024 {
        return Err("preset exceeds 128 KB".into());
    }
    let value: Value = serde_json::from_str(text).map_err(|error| error.to_string())?;
    if value.get("format").and_then(Value::as_str) != Some("broken-fm-preset")
        || value.get("version").and_then(Value::as_u64) != Some(16)
        || !value.get("parameters").is_some_and(Value::is_object)
    {
        return Err("incompatible BROKEN FM preset".into());
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
    let exchange = exchange_args().unwrap_or_default();
    tauri::Builder::default()
        .manage(Mutex::new(exchange))
        .invoke_handler(tauri::generate_handler![
            host_exchange_context,
            host_exchange_apply,
            host_exchange_cancel
        ])
        .run(tauri::generate_context!())
        .expect("BROKEN FM Companion failed");
}

#[cfg(test)]
mod tests {
    use super::validate_preset;

    #[test]
    fn accepts_the_frozen_preset_envelope() {
        let preset = r#"{"format":"broken-fm-preset","version":16,"name":"Test","parameters":{}}"#;
        assert!(validate_preset(preset).is_ok());
    }

    #[test]
    fn rejects_old_or_unrelated_documents() {
        assert!(
            validate_preset(r#"{"format":"broken-fm-preset","version":15,"parameters":{}}"#)
                .is_err()
        );
        assert!(validate_preset(r#"{"format":"other","version":16,"parameters":{}}"#).is_err());
    }
}
