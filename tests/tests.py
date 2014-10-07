#!/usr/bin/python

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as Expect
from selenium.webdriver.support.ui import WebDriverWait as Wait
import argparse
import sys
import unittest


class TestOffline(unittest.TestCase):
  def setUp(self):
    capabilities = {
      'chromeOptions': {
        'args': ['--enable-experimental-web-platform-features']
      }
    }
    global binary_path
    if binary_path:
      capabilities['chromeOptions']['binary'] = binary_path
    self.browser = webdriver.Chrome(desired_capabilities=capabilities, service_args=["--verbose", "--log-path=/tmp/qc1.log"])

  def tearDown(self):
    self.browser.close()
    del self.browser

  def test_offline(self):
    self.browser.get('http://localhost:3000/trained-to-thrill/')
    self.wait().until(Expect.presence_of_element_located(
      (By.CSS_SELECTOR, '.custom.refresh:not(.loading)')))

  def wait(self):
    return Wait(self.browser, 10)


def main():
  parser = argparse.ArgumentParser(description='Tests Trained to Thrill')
  parser.add_argument('--binary', required=False)
  (args, rest) = parser.parse_known_args()
  global binary_path
  binary_path = args.binary
  unittest.main(argv=[sys.argv[0]] + rest)


if __name__ == '__main__':
  main()
