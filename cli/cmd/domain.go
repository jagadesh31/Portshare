package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"portshare/config"

	"github.com/spf13/cobra"
)

var domainCmd = &cobra.Command{
	Use:   "domain",
	Short: "Manage custom domain and subdomain",
}

var claimSubdomainCmd = &cobra.Command{
	Use:   "claim [subdomain]",
	Short: "Claim a subdomain",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		subdomain := args[0]
		cfg, err := config.EnsureIdentity(ServerURL)
		if err != nil {
			return err
		}

		payload := map[string]string{
			"clientId":  cfg.ClientID,
			"subdomain": subdomain,
		}
		payloadBytes, _ := json.Marshal(payload)
		
		resp, err := http.Post(ServerURL+"/subdomain/claim", "application/json", bytes.NewReader(payloadBytes))
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}
		defer resp.Body.Close()
		
		body, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("failed to claim subdomain: %s", string(body))
		}

		cfg.Subdomain = subdomain
		if err := config.SaveConfig(cfg); err != nil {
			return fmt.Errorf("failed to save config: %w", err)
		}

		fmt.Printf("Successfully claimed subdomain: %s\n", subdomain)
		return nil
	},
}

var setCustomDomainCmd = &cobra.Command{
	Use:   "custom [domain]",
	Short: "Set a custom domain",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		domain := args[0]
		cfg, err := config.EnsureIdentity(ServerURL)
		if err != nil {
			return err
		}

		payload := map[string]string{
			"clientId": cfg.ClientID,
			"domain":   domain,
		}
		payloadBytes, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest(http.MethodPut, ServerURL+"/client/domain", bytes.NewReader(payloadBytes))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}
		defer resp.Body.Close()
		
		body, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("failed to set custom domain: %s", string(body))
		}

		cfg.CustomDomain = domain
		if err := config.SaveConfig(cfg); err != nil {
			return fmt.Errorf("failed to save config: %w", err)
		}

		fmt.Printf("Successfully set custom domain: %s\n", domain)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(domainCmd)
	domainCmd.AddCommand(claimSubdomainCmd)
	domainCmd.AddCommand(setCustomDomainCmd)
}
