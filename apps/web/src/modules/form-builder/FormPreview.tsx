import { useEffect, useRef } from "react";
import type { FormSchema } from "@ai-builder/schemas";

interface FormPreviewProps {
  schema: FormSchema;
}

// Inlined preview script — runs inside the sandboxed iframe
const PREVIEW_SCRIPT = `
(function () {
  var FIELD_TYPES_WITH_OPTIONS = ['select', 'multiselect', 'radio', 'checkbox'];

  function applyValidation(el, rules) {
    if (!rules) return;
    rules.forEach(function (r) {
      switch (r.type) {
        case 'required':   el.required = true; break;
        case 'minLength':  el.minLength = Number(r.value); break;
        case 'maxLength':  el.maxLength = Number(r.value); break;
        case 'min':        el.min = String(r.value); break;
        case 'max':        el.max = String(r.value); break;
        case 'pattern':    el.pattern = String(r.value); break;
      }
    });
  }

  function buildField(field) {
    var wrapper = document.createElement('div');
    wrapper.className = 'mb-4';

    if (field.type !== 'hidden') {
      var label = document.createElement('label');
      label.htmlFor = field.id;
      label.textContent = field.label;
      label.className = 'block text-sm font-medium mb-1';
      wrapper.appendChild(label);
    }

    if (field.hidden) { wrapper.style.display = 'none'; }

    var el;

    if (field.type === 'textarea') {
      el = document.createElement('textarea');
      el.className = 'w-full border rounded p-2 text-sm';
      el.rows = 4;
    } else if (field.type === 'select' || field.type === 'multiselect') {
      el = document.createElement('select');
      el.className = 'w-full border rounded p-2 text-sm';
      if (field.type === 'multiselect') el.multiple = true;
      (field.options || []).forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        el.appendChild(o);
      });
    } else if (field.type === 'radio' || field.type === 'checkbox') {
      var groupWrapper = document.createElement('div');
      groupWrapper.className = 'flex flex-col gap-1';
      (field.options || [{ label: field.label, value: field.name }]).forEach(function (opt) {
        var row = document.createElement('label');
        row.className = 'flex items-center gap-2 text-sm';
        var input = document.createElement('input');
        input.type = field.type;
        input.name = field.name;
        input.value = opt.value;
        applyValidation(input, field.validation);
        row.appendChild(input);
        row.appendChild(document.createTextNode(opt.label));
        groupWrapper.appendChild(row);
      });
      wrapper.appendChild(groupWrapper);
      if (field.helpText) {
        var help = document.createElement('p');
        help.textContent = field.helpText;
        help.className = 'text-xs text-gray-500 mt-1';
        wrapper.appendChild(help);
      }
      return wrapper;
    } else {
      el = document.createElement('input');
      el.type = field.type;
      el.className = 'w-full border rounded p-2 text-sm';
    }

    el.id = field.id;
    el.name = field.name;
    if (field.placeholder) el.placeholder = field.placeholder;
    if (field.defaultValue) el.value = field.defaultValue;
    if (field.disabled) el.disabled = true;
    applyValidation(el, field.validation);
    wrapper.appendChild(el);

    if (field.helpText) {
      var help = document.createElement('p');
      help.textContent = field.helpText;
      help.className = 'text-xs text-gray-500 mt-1';
      wrapper.appendChild(help);
    }

    return wrapper;
  }

  function render(schema) {
    var form = document.getElementById('preview-form');
    if (!form) return;

    // Keep the submit button, clear field children
    var submitBtn = form.querySelector('button[type=submit]');
    form.innerHTML = '';

    (schema.fields || []).forEach(function (field) {
      form.appendChild(buildField(field));
    });

    if (submitBtn) {
      form.appendChild(submitBtn);
    } else {
      var btn = document.createElement('button');
      btn.type = 'submit';
      btn.textContent = schema.submitLabel || 'Submit';
      btn.className = 'px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-700';
      form.appendChild(btn);
    }
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'UPDATE_FORM') render(e.data.schema);
  });

  document.getElementById('preview-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(e.target));
    window.parent.postMessage({ type: 'FORM_SUBMIT', data: data }, '*');
  });
})();
`;

const PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { font-family: system-ui, sans-serif; }</style>
</head>
<body class="p-6 bg-white">
  <form id="preview-form" class="space-y-4 max-w-md">
    <p class="text-sm text-gray-400">Preview will appear here...</p>
  </form>
  <script>${PREVIEW_SCRIPT}</script>
</body>
</html>`;

export function FormPreview({ schema }: FormPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isLoadedRef = useRef(false);

  const sendToIframe = (s: FormSchema) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "UPDATE_FORM", schema: s }, "*");
  };

  // Send updated schema whenever it changes (if iframe is already loaded)
  useEffect(() => {
    if (isLoadedRef.current) {
      sendToIframe(schema);
    }
  }, [schema]);

  return (
    <iframe
      ref={iframeRef}
      title="Form Preview"
      srcDoc={PREVIEW_HTML}
      // No allow-same-origin — security requirement
      sandbox="allow-scripts allow-forms"
      className="h-full w-full rounded-md border bg-white"
      onLoad={() => {
        // sandbox without allow-same-origin makes contentDocument inaccessible,
        // so we track load state via this callback instead of readyState checks
        isLoadedRef.current = true;
        sendToIframe(schema);
      }}
    />
  );
}
