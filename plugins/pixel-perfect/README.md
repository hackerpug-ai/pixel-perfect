# Pixel Perfect for Pi

Pixel Perfect provides ten design-system workflows to the Pi coding agent as namespaced skills.

Install the package:

```bash
pi install npm:@hackerpug-ai/pixel-perfect
```

From a repository checkout, install the local package with `pi install ./plugins/pixel-perfect`.

Start a workflow with `/skill:pixel-perfect-<name>`. For example:

```text
/skill:pixel-perfect-init
/skill:pixel-perfect-build atoms
/skill:pixel-perfect-status
```

The package includes the complete workflow, design contract, validators, and reference documentation. Pi loads thin namespaced adapters from `.pi/skills`; each adapter delegates to the same canonical runtime used by the other supported harnesses.
