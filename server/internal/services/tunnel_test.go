package services

import "testing"

func TestReservedAPISubdomain(t *testing.T) {
	if isReservedSubdomain("api") == false {
		t.Fatal("api subdomain should be reserved")
	}
	if isReservedSubdomain("app") {
		t.Fatal("app subdomain should not be reserved")
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
