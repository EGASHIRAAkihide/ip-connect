# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "IP Connect PoC" [ref=e4] [cursor=pointer]:
        - /url: /
      - navigation "Main navigation" [ref=e5]:
        - generic [ref=e6]:
          - link "Home" [ref=e7] [cursor=pointer]:
            - /url: /
          - link "Browse IP" [ref=e8] [cursor=pointer]:
            - /url: /ip
          - link "Login" [ref=e9] [cursor=pointer]:
            - /url: /auth/login
          - link "Register" [ref=e10] [cursor=pointer]:
            - /url: /auth/register
          - button "日本語" [ref=e11]
  - main [ref=e12]:
    - generic [ref=e13]:
      - heading "Log in" [level=1] [ref=e14]
      - paragraph [ref=e15]: Use the same email/password you registered with.
      - generic [ref=e16]:
        - generic [ref=e17]:
          - text: Email
          - textbox "Email" [active] [ref=e18]
        - generic [ref=e19]:
          - text: Password
          - textbox "Password" [ref=e20]
        - button "Log in" [ref=e21]
      - paragraph [ref=e22]:
        - text: Need an account?
        - link "Sign up" [ref=e23] [cursor=pointer]:
          - /url: /auth/register
  - button "Open Next.js Dev Tools" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
  - alert [ref=e33]
```