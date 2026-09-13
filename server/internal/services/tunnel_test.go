package services

import "testing"

func TestReservedAPISubdomain(t *testing.T) {
	for _, name := range []string{"api", "admin", "www", "app", "dashboard", "portshare"} {
		if !isReservedSubdomain(name) {
			t.Errorf("%s subdomain should be reserved", name)
		}
	}
	for _, name := range []string{"myapp", "dev-jagadesh", "cool-tunnel"} {
		if isReservedSubdomain(name) {
			t.Errorf("%s subdomain should not be reserved", name)
		}
	}
}

func TestClientForHostResolvesPersistedSubdomain(t *testing.T) {
	t.Setenv("PORTSHARE_ROOT_DOMAIN", "jagadesh31.tech")
	clientStore.Lock()
	originalClients := clientStore.clients
	originalSubdomains := clientStore.subdomains
	clientStore.clients = map[string]*clientRecord{
		"user-1": {ID: "user-1", Subdomain: "demo"},
	}
	clientStore.subdomains = map[string]string{"demo": "user-1"}
	clientStore.Unlock()
	t.Cleanup(func() {
		clientStore.Lock()
		clientStore.clients = originalClients
		clientStore.subdomains = originalSubdomains
		clientStore.Unlock()
	})

	if got := clientForHost("Demo.jagadesh31.tech:443"); got != "user-1" {
		t.Fatalf("clientForHost() = %q, want %q", got, "user-1")
	}
}
