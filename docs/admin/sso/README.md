---
navTitle: Configuring Single Sign-On (SSO)
---

# Configuring Single Sign-On

_This feature is only available on self-hosted Enterprise licensed instances of FlowFuse._

FlowFuse allows users to sign in through their SAML identity provider, such
as Google Workspace, or using LDAP against a directory service provider.

The platform can be configured with multiple SSO configurations and uses the
user's email domain to identify which provider should be used.

The user must already exist on the FlowFuse platform before they can sign in via SSO.

Admin users will still be able to log in with their original FlowFuse username/password - this ensures
they don't get locked out of the platform if there is a problem with the SSO configuration.

## SAML SSO

SAML based SSO allows the FlowFuse platform to authenticate users against their
identity provider such as Google Workspace.

Once enabled for a particular email domain, regular users on that domain will be
directed to the Identity Provider in order to log in. They will no longer be able
to log in with their local password, nor will they be able to change their email
address in User Settings.

 - [Configuring SAML SSO](saml)

 ## LDAP SSO

 LDAP based SSO allows the FlowFuse platform to authenticate users against a directory
 service provider, such as OpenLDAP.

 When logging in, the users credentials are passed to the serivce provider to verify.

  - [Configuring LDAP SSO](ldap)



 
