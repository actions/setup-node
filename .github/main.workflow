workflow "CI" {
  on = "push"
  resolves = ["Format", "Build", "Test"]
}

action "Dependencies" {
  uses = "actions/npm@v2.0.0"
  args = "install"
}

action "Build" {
  needs = "Dependencies"
  uses = "actions/npm@v2.0.0"
  args = "run build"
}

action "Format" {
  needs = "Dependencies"
  uses = "actions/npm@v2.0.0"
  args = "run format-check"
}

action "Test" {
  needs = "Dependencies"
  uses = "actions/npm@v2.0.0"
  args = "test"
}