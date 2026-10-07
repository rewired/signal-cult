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
    state: String,
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

fn validate_state(text: &str) -> Result<Value, String> {
    if text.len() > 128 * 1024 {
        return Err("state exceeds 128 KB".into());
    }
    let value: Value = serde_json::from_str(text).map_err(|error| error.to_string())?;
    if value.get("format").and_then(Value::as_str) != Some("grid-rot-companion-state")
        || value.get("version").and_then(Value::as_u64) != Some(1)
    {
        return Err("incompatible GRID ROT state".into());
    }
    let contract: Value =
        serde_json::from_str(include_str!("../../../native/generated/companion-contract.json"))
            .map_err(|error| error.to_string())?;
    let mode = value
        .get("mode")
        .and_then(Value::as_u64)
        .ok_or("invalid movement mode")?;
    if mode >= contract["modes"].as_array().ok_or("invalid contract")?.len() as u64 {
        return Err("invalid movement mode".into());
    }
    let values = value
        .get("values")
        .and_then(Value::as_object)
        .ok_or("missing parameter values")?;
    for definition in contract["parameters"]
        .as_array()
        .ok_or("invalid parameter contract")?
    {
        let id = definition["id"].as_str().ok_or("invalid parameter ID")?;
        let number = values
            .get(id)
            .and_then(Value::as_f64)
            .ok_or_else(|| format!("missing parameter: {id}"))?;
        let minimum = definition["min"].as_f64().ok_or("invalid minimum")?;
        let maximum = definition["max"].as_f64().ok_or("invalid maximum")?;
        if !number.is_finite() || number < minimum || number > maximum {
            return Err(format!("invalid parameter: {id}"));
        }
        if definition["kind"] != "Double" && number.fract() != 0.0 {
            return Err(format!("non-integral parameter: {id}"));
        }
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
            state: String::new(),
            preview_data_url: String::new(),
        });
    };
    let input_text = fs::read_to_string(input).map_err(|error| error.to_string())?;
    validate_state(&input_text)?;
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
        state: input_text,
        preview_data_url,
    })
}

#[tauri::command]
fn host_exchange_apply(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<ExchangeState>>,
    state_text: String,
) -> Result<(), String> {
    let normalized =
        serde_json::to_string_pretty(&validate_state(&state_text)?).map_err(|e| e.to_string())?
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
    let exchange = exchange_args().expect("Invalid GRID ROT OFX exchange arguments");
    tauri::Builder::default()
        .manage(Mutex::new(exchange))
        .invoke_handler(tauri::generate_handler![
            host_exchange_context,
            host_exchange_apply,
            host_exchange_cancel
        ])
        .run(tauri::generate_context!())
        .expect("GRID ROT Companion failed");
}

#[cfg(test)]
mod tests {
    use super::validate_state;
    use serde_json::{json, Map, Value};

    fn state() -> Value {
        let contract: Value =
            serde_json::from_str(include_str!("../../../native/generated/companion-contract.json"))
                .unwrap();
        let mut values = Map::new();
        for definition in contract["parameters"].as_array().unwrap() {
            values.insert(
                definition["id"].as_str().unwrap().into(),
                definition["initial"].clone(),
            );
        }
        json!({
            "format": "grid-rot-companion-state",
            "version": 1,
            "name": "Test",
            "mode": 4,
            "values": values
        })
    }

    #[test]
    fn accepts_complete_state() {
        assert!(validate_state(&state().to_string()).is_ok());
    }

    #[test]
    fn rejects_incomplete_invalid_and_fractional_state() {
        let mut value = state();
        value["values"].as_object_mut().unwrap().remove("density");
        assert!(validate_state(&value.to_string()).is_err());

        let mut value = state();
        value["mode"] = 9.into();
        assert!(validate_state(&value.to_string()).is_err());

        let mut value = state();
        value["values"]["density"] = 1.5.into();
        assert!(validate_state(&value.to_string()).is_err());

        let mut value = state();
        value["values"]["amount"] = 2.into();
        assert!(validate_state(&value.to_string()).is_err());
    }
}
